<?php

namespace App\Actions;

use App\Enums\OrderStatus;
use App\Enums\ReceiptStatus;
use App\Models\Order;
use App\Models\PaymentReceipt;
use App\Notifications\ReceiptSubmitted;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class SubmitReceipt
{
    /**
     * Store a transfer receipt and queue the order for review.
     *
     * @throws ValidationException when the order can't take a receipt, or the receipt was used before
     */
    public function handle(Order $order, UploadedFile $file, string $transactionReference): Order
    {
        $order->expireIfDue();

        if ($order->status === OrderStatus::Expired) {
            throw ValidationException::withMessages([
                'receipt' => 'This order expired before a receipt arrived, and its codes were released. If you already transferred the money, contact us with your receipt and we’ll sort it out.',
            ]);
        }

        if ($order->status !== OrderStatus::AwaitingPayment) {
            throw ValidationException::withMessages(['receipt' => 'This order isn’t waiting for a payment.']);
        }

        $reference = PaymentReceipt::normalizeReference($transactionReference);
        if (strlen($reference) < 4) {
            throw ValidationException::withMessages([
                'transaction_reference' => 'Copy the transaction number exactly as it appears on the receipt.',
            ]);
        }
        $sha256 = hash_file('sha256', $file->getRealPath());

        // The same bank transfer can't pay for two orders.
        $reused = PaymentReceipt::query()
            ->where('order_id', '!=', $order->id)
            ->where('status', '!=', ReceiptStatus::Rejected)
            ->where(fn ($q) => $q->where('transaction_reference', $reference)->orWhere('sha256', $sha256))
            ->exists();

        if ($reused) {
            throw ValidationException::withMessages([
                'transaction_reference' => 'This receipt has already been used for another order. If you think that’s a mistake, contact us.',
            ]);
        }

        $path = $file->storeAs("receipts/{$order->public_id}", Str::ulid().'.'.$file->extension(), 'local');

        DB::transaction(function () use ($order, $file, $path, $sha256, $reference) {
            $order->receipts()->create([
                'disk' => 'local',
                'path' => $path,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
                'sha256' => $sha256,
                'transaction_reference' => $reference,
                'status' => ReceiptStatus::Pending,
            ]);
            $order->update(['status' => OrderStatus::InReview, 'rejection_reason' => null]);
        });

        if ($admin = config('shop.admin_email')) {
            try {
                Notification::route('mail', $admin)->notify(new ReceiptSubmitted($order));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $order->refresh();
    }
}
