<?php

namespace App\Models;

use App\Enums\ReportStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'order_id', 'coupon_code_id', 'locale', 'reason', 'details', 'screenshot_path', 'preference',
    'refund_method', 'refund_account_name', 'refund_account_number', 'status', 'replacement_code_id',
    'refund_amount_minor', 'refund_reference', 'decline_code', 'resolution_note', 'resolved_at', 'resolved_by',
])]
#[Hidden(['refund_account_number'])]
class ProblemReport extends Model
{
    public const REASONS = ['invalid', 'already_used', 'wrong_region', 'other'];

    public const PREFERENCES = ['replacement', 'refund'];

    public const DECLINE_CODES = ['already_redeemed', 'works', 'region_stated', 'other'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReportStatus::class,
            'refund_account_number' => 'encrypted',
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<CouponCode, $this>
     */
    public function code(): BelongsTo
    {
        return $this->belongsTo(CouponCode::class, 'coupon_code_id');
    }

    /**
     * @return BelongsTo<CouponCode, $this>
     */
    public function replacement(): BelongsTo
    {
        return $this->belongsTo(CouponCode::class, 'replacement_code_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * What the customer is told about the outcome, in the current locale.
     */
    public function customerMessage(): ?string
    {
        $note = $this->resolution_note ? ' '.$this->resolution_note : '';

        return match ($this->status) {
            ReportStatus::Declined => trim(__("shop.report.decline.{$this->decline_code}").$note),
            ReportStatus::Replaced, ReportStatus::Refunded => $this->resolution_note,
            default => null,
        };
    }
}
