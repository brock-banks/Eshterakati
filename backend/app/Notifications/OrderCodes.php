<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Number;

/**
 * Emails a copy of the purchased codes, so the shopper has them even if
 * they close the confirmation screen before copying.
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
            ->subject('Your Eshterakati codes')
            ->greeting('Your codes are ready')
            ->line('Thanks for your order. Keep this email somewhere safe — each code works once.');

        foreach ($this->order->items as $item) {
            $deal = $item->option->deal;
            foreach ($item->codes as $code) {
                $message->line("**{$deal->merchant} {$deal->title} · {$item->option->label}**: `{$code->code}`");
            }
        }

        return $message
            ->line('Total paid: '.Number::currency($this->order->total_cents / 100, $this->order->currency))
            ->line('If a code doesn’t work, reply to this email within 30 days for a full refund.');
    }
}
