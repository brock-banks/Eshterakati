<?php

namespace App\Actions;

use App\Enums\CouponCodeStatus;
use App\Enums\ReportStatus;
use App\Models\CouponCode;
use App\Models\ProblemReport;
use App\Models\User;
use App\Notifications\ReportResolved;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use LogicException;
use RuntimeException;
use Throwable;

/**
 * An admin's decision on a problem report. Replacing or refunding retires the
 * reported code (disputed, never resold); declining leaves it with the customer.
 */
class ResolveReport
{
    /**
     * Give the customer the next code in stock for the same option.
     *
     * @throws RuntimeException when there is no stock to replace with
     */
    public function replace(ProblemReport $report, User $admin, ?string $note = null): ProblemReport
    {
        $this->assertOpen($report);

        DB::transaction(function () use ($report, $admin, $note) {
            $original = $report->code;
            $replacement = CouponCode::query()
                ->where('deal_option_id', $original->deal_option_id)
                ->where('status', CouponCodeStatus::Available)
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $replacement) {
                throw new RuntimeException('No codes in stock for this option. Add codes to the deal, or refund instead.');
            }

            $replacement->update([
                'status' => CouponCodeStatus::Sold,
                'order_item_id' => $original->order_item_id,
                'sold_at' => now(),
                'expires_at' => now()->addMonths(config('shop.code_validity_months')),
            ]);
            $original->update(['status' => CouponCodeStatus::Disputed]);

            $report->update([
                'status' => ReportStatus::Replaced,
                'replacement_code_id' => $replacement->id,
                'resolution_note' => $this->clean($note),
                'resolved_at' => now(),
                'resolved_by' => $admin->id,
            ]);
        });

        return $this->notify($report->refresh());
    }

    /**
     * Record a refund the admin has already transferred.
     */
    public function refund(ProblemReport $report, User $admin, int $amountMinor, string $transferReference, ?string $note = null): ProblemReport
    {
        $this->assertOpen($report);

        if (! $report->refund_account_number) {
            throw new LogicException('Add the customer’s refund account before marking this report refunded.');
        }

        DB::transaction(function () use ($report, $admin, $amountMinor, $transferReference, $note) {
            $report->code->update(['status' => CouponCodeStatus::Disputed]);
            $report->update([
                'status' => ReportStatus::Refunded,
                'refund_amount_minor' => $amountMinor,
                'refund_reference' => trim($transferReference),
                'resolution_note' => $this->clean($note),
                'resolved_at' => now(),
                'resolved_by' => $admin->id,
            ]);
        });

        return $this->notify($report->refresh());
    }

    /**
     * Turn the report down. The reason code is translated for the customer; the note is shown as written.
     */
    public function decline(ProblemReport $report, User $admin, string $code, ?string $note = null): ProblemReport
    {
        $this->assertOpen($report);

        if (! in_array($code, ProblemReport::DECLINE_CODES, true)) {
            throw new LogicException("Unknown decline reason [{$code}].");
        }

        $report->update([
            'status' => ReportStatus::Declined,
            'decline_code' => $code,
            'resolution_note' => $this->clean($note),
            'resolved_at' => now(),
            'resolved_by' => $admin->id,
        ]);

        return $this->notify($report->refresh());
    }

    private function assertOpen(ProblemReport $report): void
    {
        if ($report->status !== ReportStatus::Open) {
            throw new LogicException('This report has already been resolved.');
        }
    }

    private function clean(?string $note): ?string
    {
        return filled($note) ? trim($note) : null;
    }

    private function notify(ProblemReport $report): ProblemReport
    {
        $email = $report->order->email;
        if ($email) {
            // The decision is saved; a mail failure must not undo it.
            try {
                Notification::route('mail', $email)->notify((new ReportResolved($report))->locale($report->locale));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $report;
    }
}
