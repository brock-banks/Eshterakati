<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Transfer instructions, so the customer can finish paying from another device.
 */
class OrderPlaced extends Notification
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
        $pay = $this->order->paymentDetails();

        return (new MailMessage)
            ->subject("Complete your payment · {$this->order->reference}")
            ->greeting('Your codes are reserved')
            ->line('Transfer **'.Money::format($this->order->total_minor, $this->order->currency)."** with {$pay['name']} ({$pay['provider']}):")
            ->line("Account number: **{$pay['account_number']}**".($pay['account_name'] ? " · {$pay['account_name']}" : ''))
            ->line("Write **{$this->order->reference}** in the transfer note.")
            ->line('Then upload a screenshot of the receipt before '.$this->order->expires_at->format('g:i A, M j').'.')
            ->action('Upload receipt', $this->order->orderUrl());
    }
}
