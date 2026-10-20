<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['order_id', 'deal_option_id', 'quantity', 'unit_price_cents', 'unit_face_value_cents'])]
class OrderItem extends Model
{
    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<DealOption, $this>
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(DealOption::class, 'deal_option_id');
    }

    /**
     * @return HasMany<CouponCode, $this>
     */
    public function codes(): HasMany
    {
        return $this->hasMany(CouponCode::class);
    }
}
