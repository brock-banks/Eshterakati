<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails a copy of the purchased codes once payment is confirmed.
 */
class OrderCodes extends Notification
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
        $message = (new MailMessage)
            ->subject(__('shop.mail.codes.subject', ['reference' => $this->order->reference]))
            ->greeting(__('shop.mail.codes.greeting'))
            ->line(__('shop.mail.codes.keep_safe'));

        foreach ($this->order->items as $item) {
            $deal = $item->option->deal;
            foreach ($item->codes as $code) {
                $message->line("**{$deal->merchant} {$deal->localized('title')} · {$item->option->localized('label')}**: `{$code->code}`");
            }
        }

        return $message
            ->line(__('shop.mail.codes.total', ['amount' => Money::format($this->order->total_minor, $this->order->currency)]))
            ->action(__('shop.mail.codes.action'), $this->order->orderUrl())
            ->line(__('shop.mail.codes.refund'))
            ->salutation(__('shop.mail.salutation'));
    }
}
