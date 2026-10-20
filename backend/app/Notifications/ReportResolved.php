<?php

namespace App\Notifications;

use App\Enums\ReportStatus;
use App\Models\ProblemReport;
use App\Support\Money;
use App\Support\PaymentMethods;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the customer how their report was resolved, in the language they reported in.
 */
class ReportResolved extends Notification
{
    use Queueable;

    public function __construct(public ProblemReport $report) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $report = $this->report;
        $order = $report->order;
        $option = $report->code->option;
        $item = "{$option->deal->merchant} {$option->deal->localized('title')} · {$option->localized('label')}";
        $ref = ['reference' => $order->reference];

        $message = match ($report->status) {
            ReportStatus::Replaced => (new MailMessage)
                ->subject(__('shop.report.mail.replaced.subject', $ref))
                ->greeting(__('shop.report.mail.replaced.greeting'))
                ->line(__('shop.report.mail.replaced.intro', ['item' => $item]))
                ->line("`{$report->replacement->code}`")
                ->action(__('shop.report.mail.replaced.action'), $order->orderUrl()),
            ReportStatus::Refunded => (new MailMessage)
                ->subject(__('shop.report.mail.refunded.subject', $ref))
                ->greeting(__('shop.report.mail.refunded.greeting'))
                ->line(__('shop.report.mail.refunded.intro', [
                    'amount' => Money::format($report->refund_amount_minor, $order->currency),
                    'method' => ($pay = PaymentMethods::find((string) $report->refund_method)) ? PaymentMethods::label($pay)['name'] : $report->refund_method,
                    'last4' => substr($report->refund_account_number, -4),
                    'transfer' => $report->refund_reference,
                ])),
            default => (new MailMessage)
                ->subject(__('shop.report.mail.declined.subject', $ref))
                ->greeting(__('shop.report.mail.declined.greeting')),
        };

        if ($text = $report->customerMessage()) {
            $message->line($text);
        }

        return $message->salutation(__('shop.mail.salutation'));
    }
}
