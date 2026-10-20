<?php

namespace App\Models;

use App\Enums\CouponCodeStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['deal_option_id', 'order_item_id', 'code', 'status', 'sold_at', 'expires_at'])]
#[Hidden(['code'])]
class CouponCode extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'code' => 'encrypted',
            'status' => CouponCodeStatus::class,
            'sold_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<DealOption, $this>
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(DealOption::class, 'deal_option_id');
    }

    /**
     * @return BelongsTo<OrderItem, $this>
     */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
