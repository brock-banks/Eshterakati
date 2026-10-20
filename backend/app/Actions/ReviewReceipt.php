<?php

namespace App\Actions;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Enums\ReceiptStatus;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderCodes;
use App\Notifications\PaymentRejected;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use LogicException;
use Throwable;

/**
 * An admin's decision on the latest receipt, after checking the transfer
 * landed in the bank account (not just that the screenshot looks right).
 */
class ReviewReceipt
{
    public function approve(Order $order, User $admin): Order
    {
        $this->assertInReview($order);

        DB::transaction(function () use ($order, $admin) {
            $order->latestReceipt->update(['status' => ReceiptStatus::Accepted]);
            $order->update(['status' => OrderStatus::Paid, 'paid_at' => now(), 'reviewed_by' => $admin->id]);

            foreach ($order->items()->with('option')->get() as $item) {
                CouponCode::where('order_item_id', $item->id)->update([
                    'status' => CouponCodeStatus::Sold,
                    'sold_at' => now(),
                    'expires_at' => now()->addMonths(config('shop.code_validity_months')),
                ]);
                Deal::whereKey($item->option->deal_id)->increment('sold_count', $item->quantity);
            }
        });

        $this->notify($order, new OrderCodes($order->load('items.option.deal', 'items.codes')));

        return $order;
    }

    public const REJECTION_CODES = ['not_received', 'amount', 'unreadable', 'wrong_account'];

    /**
     * Send the order back to the customer to try again. Codes stay reserved for a fresh payment window.
     * The code is translated for the customer (lang/{locale}/shop.php); the note is shown as written.
     */
    public function reject(Order $order, User $admin, string $code, ?string $note = null): Order
    {
        $this->assertInReview($order);

        if (! in_array($code, self::REJECTION_CODES, true)) {
            throw new LogicException("Unknown rejection reason [{$code}].");
        }

        DB::transaction(function () use ($order, $admin, $code, $note) {
            $order->latestReceipt->update(['status' => ReceiptStatus::Rejected]);
            $order->update([
                'status' => OrderStatus::AwaitingPayment,
                'rejection_code' => $code,
                'rejection_note' => filled($note) ? trim($note) : null,
                'reviewed_by' => $admin->id,
                'expires_at' => now()->addMinutes(config('shop.payment_window_minutes')),
            ]);
        });

        $this->notify($order, new PaymentRejected($order));

        return $order;
    }

    private function assertInReview(Order $order): void
    {
        if ($order->status !== OrderStatus::InReview || ! $order->latestReceipt) {
            throw new LogicException("Order {$order->reference} has no receipt waiting for review.");
        }
    }

    private function notify(Order $order, object $notification): void
    {
        if (! $order->email) {
            return;
        }

        // The decision is already saved; a mail failure must not undo it.
        try {
            Notification::route('mail', $order->email)->notify($notification->locale($order->locale));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
