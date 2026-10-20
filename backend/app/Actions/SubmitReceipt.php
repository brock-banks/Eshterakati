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
            throw ValidationException::withMessages(['receipt' => __('shop.receipt.expired')]);
        }

        if ($order->status !== OrderStatus::AwaitingPayment) {
            throw ValidationException::withMessages(['receipt' => __('shop.receipt.not_waiting')]);
        }

        $reference = PaymentReceipt::normalizeReference($transactionReference);
        if (strlen($reference) < 4) {
            throw ValidationException::withMessages(['transaction_reference' => __('shop.validation.reference_short')]);
        }
        $sha256 = hash_file('sha256', $file->getRealPath());

        // The same bank transfer can't pay for two orders.
        $reused = PaymentReceipt::query()
            ->where('order_id', '!=', $order->id)
            ->where('status', '!=', ReceiptStatus::Rejected)
            ->where(fn ($q) => $q->where('transaction_reference', $reference)->orWhere('sha256', $sha256))
            ->exists();

        if ($reused) {
            throw ValidationException::withMessages(['transaction_reference' => __('shop.receipt.reused')]);
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
            $order->update(['status' => OrderStatus::InReview, 'rejection_code' => null, 'rejection_note' => null]);
        });

        if ($admin = config('shop.admin_email')) {
            try {
                // Staff read the admin in English.
                Notification::route('mail', $admin)->notify((new ReceiptSubmitted($order))->locale('en'));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $order->refresh();
    }
}
