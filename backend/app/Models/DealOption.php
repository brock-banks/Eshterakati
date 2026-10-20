<?php

namespace App\Models;

use App\Enums\CouponCodeStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['deal_id', 'label', 'face_value_cents', 'price_cents', 'sort_order'])]
class DealOption extends Model
{
    /**
     * @return BelongsTo<Deal, $this>
     */
    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    /**
     * @return HasMany<CouponCode, $this>
     */
    public function codes(): HasMany
    {
        return $this->hasMany(CouponCode::class);
    }

    /**
     * @return HasMany<CouponCode, $this>
     */
    public function availableCodes(): HasMany
    {
        return $this->codes()->where('status', CouponCodeStatus::Available);
    }

    public function discountPercent(): int
    {
        return (int) round((1 - $this->price_cents / $this->face_value_cents) * 100);
    }
}
