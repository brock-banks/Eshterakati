<?php

namespace App\Actions;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Enums\ReportStatus;
use App\Models\CouponCode;
use App\Models\Order;
use App\Models\ProblemReport;
use App\Notifications\ProblemReported;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ReportProblem
{
    /**
     * Record that a purchased code doesn't work, for an admin to resolve.
     *
     * @param  array{reason: string, details?: ?string, preference: string, refund_method?: ?string, refund_account_number?: ?string, refund_account_name?: ?string}  $data
     *
     * @throws ValidationException when the code can't be reported
     */
    public function handle(Order $order, CouponCode $code, array $data, ?UploadedFile $screenshot): ProblemReport
    {
        $belongs = $code->orderItem?->order_id === $order->id;

        if (! $belongs || $order->status !== OrderStatus::Paid || $code->status !== CouponCodeStatus::Sold) {
            throw ValidationException::withMessages(['reason' => __('shop.report.not_reportable')]);
        }

        if ($code->report()->exists()) {
            throw ValidationException::withMessages(['reason' => __('shop.report.already_reported')]);
        }

        if ($code->reportableUntil()?->isPast()) {
            throw ValidationException::withMessages(['reason' => __('shop.report.window_closed', [
                'days' => config('shop.report_window_days'),
                'date' => $code->sold_at->locale(app()->getLocale())->isoFormat('LL'),
            ])]);
        }

        $refund = $data['preference'] === 'refund';
        $path = $screenshot?->storeAs("reports/{$order->public_id}", Str::ulid().'.'.$screenshot->extension(), 'local');

        $report = ProblemReport::create([
            'order_id' => $order->id,
            'coupon_code_id' => $code->id,
            'locale' => app()->getLocale(),
            'reason' => $data['reason'],
            'details' => filled($data['details'] ?? null) ? trim($data['details']) : null,
            'screenshot_path' => $path,
            'preference' => $data['preference'],
            'refund_method' => $refund ? $data['refund_method'] : null,
            'refund_account_name' => $refund ? trim($data['refund_account_name']) : null,
            'refund_account_number' => $refund ? preg_replace('/\s+/', '', $data['refund_account_number']) : null,
            'status' => ReportStatus::Open,
        ]);

        if ($admin = config('shop.admin_email')) {
            try {
                Notification::route('mail', $admin)->notify((new ProblemReported($report))->locale('en'));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $report;
    }
}
