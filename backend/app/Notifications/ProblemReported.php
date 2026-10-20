<?php

namespace App\Notifications;

use App\Models\ProblemReport;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProblemReported extends Notification
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
        $option = $this->report->code->option;

        return (new MailMessage)
            ->subject("Code reported · {$this->report->order->reference}")
            ->line("A customer reported that {$option->deal->merchant} {$option->label} doesn’t work ({$this->report->reason}).")
            ->line("They would like a {$this->report->preference}.")
            ->action('Review in admin', url("/admin/problem-reports/{$this->report->id}"));
    }
}
