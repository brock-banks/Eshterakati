<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'slug', 'category_id', 'merchant', 'title', 'blurb', 'hue', 'region',
    'rating', 'reviews_count', 'sold_count', 'is_featured', 'is_active', 'ends_at',
])]
class Deal extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'float',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'ends_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return HasMany<DealOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(DealOption::class)->orderBy('sort_order');
    }

    /**
     * Deals that are switched on and have not ended.
     *
     * @param  Builder<Deal>  $query
     */
    public function scopeListed(Builder $query): void
    {
        $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
