<?php

namespace App\Models;

use App\Enums\CouponCodeStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['deal_id', 'label', 'price_minor', 'compare_at_minor', 'sort_order'])]
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

    /**
     * Percentage off the compare-at price, when the option is on sale.
     */
    public function discountPercent(): ?int
    {
        if (! $this->compare_at_minor || $this->compare_at_minor <= $this->price_minor) {
            return null;
        }

        return (int) round((1 - $this->price_minor / $this->compare_at_minor) * 100);
    }
}
