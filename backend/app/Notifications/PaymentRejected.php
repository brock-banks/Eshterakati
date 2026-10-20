<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentRejected extends Notification
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
        return (new MailMessage)
            ->subject("We couldn’t confirm your payment · {$this->order->reference}")
            ->greeting('We couldn’t confirm your payment')
            ->line($this->order->rejection_reason)
            ->line('Your codes are still reserved until '.$this->order->expires_at->format('g:i A, M j').'. Upload a new receipt to finish your order.')
            ->action('Upload a new receipt', $this->order->orderUrl());
    }
}
