<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use App\Support\PaymentMethods;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Transfer instructions, so the customer can finish paying from another device.
 * Sent in the order's language (see ->locale() at the call site).
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
        $label = PaymentMethods::label($pay);
        $ref = ['reference' => $this->order->reference];

        return (new MailMessage)
            ->subject(__('shop.mail.placed.subject', $ref))
            ->greeting(__('shop.mail.placed.greeting'))
            ->line(__('shop.mail.placed.transfer', [
                'amount' => Money::format($this->order->total_minor, $this->order->currency),
                'method' => $label['name'],
                'provider' => $label['provider'],
            ]))
            ->line(__('shop.mail.placed.account', ['number' => $pay['account_number']]).($pay['account_name'] ? " · {$pay['account_name']}" : ''))
            ->line(__('shop.mail.placed.note', $ref))
            ->line(__('shop.mail.placed.deadline', ['time' => $this->order->deadlineForHumans()]))
            ->action(__('shop.mail.placed.action'), $this->order->orderUrl())
            ->salutation(__('shop.mail.salutation'));
    }
}
