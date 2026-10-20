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
            ->subject(__('shop.mail.rejected.subject', ['reference' => $this->order->reference]))
            ->greeting(__('shop.mail.rejected.greeting'))
            ->line($this->order->rejectionMessage())
            ->line(__('shop.mail.rejected.still_reserved', ['time' => $this->order->deadlineForHumans()]))
            ->action(__('shop.mail.rejected.action'), $this->order->orderUrl())
            ->salutation(__('shop.mail.salutation'));
    }
}
