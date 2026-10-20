<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReceiptSubmitted extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $receipt = $this->order->latestReceipt;

        return (new MailMessage)
            ->subject("Receipt to check · {$this->order->reference}")
            ->line('A customer uploaded a transfer receipt for '.Money::format($this->order->total_minor, $this->order->currency)." via {$this->order->payment_method}.")
            ->line("Transaction number: {$receipt?->transaction_reference}")
            ->line('Check that the money arrived in the account before approving.')
            ->action('Review in admin', url("/admin/orders/{$this->order->public_id}"));
    }
}
