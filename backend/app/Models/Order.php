<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable(['email', 'status', 'currency', 'face_value_cents', 'total_cents', 'paid_at'])]
class Order extends Model
{
    use HasUlids;

    /**
     * The ULID is the public identifier; the numeric id stays internal.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasManyThrough<CouponCode, OrderItem, $this>
     */
    public function codes(): HasManyThrough
    {
        return $this->hasManyThrough(CouponCode::class, OrderItem::class);
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
