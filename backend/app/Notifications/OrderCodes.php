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
            ->subject("Your codes are ready · {$this->order->reference}")
            ->greeting('Payment confirmed — your codes are ready')
            ->line('Keep this email somewhere safe. Each code works once.');

        foreach ($this->order->items as $item) {
            $deal = $item->option->deal;
            foreach ($item->codes as $code) {
                $message->line("**{$deal->merchant} {$deal->title} · {$item->option->label}**: `{$code->code}`");
            }
        }

        return $message
            ->line('Total paid: '.Money::format($this->order->total_minor, $this->order->currency))
            ->action('View your order', $this->order->orderUrl())
            ->line('If a code doesn’t work, reply to this email within 30 days for a full refund.');
    }
}
