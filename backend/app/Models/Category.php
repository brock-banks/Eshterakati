<?php

namespace App\Models;

use App\Models\Concerns\HasArabicCopy;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'name_ar', 'icon', 'hue', 'blurb', 'blurb_ar', 'sort_order'])]
class Category extends Model
{
    use HasArabicCopy;

    /**
     * @return HasMany<Deal, $this>
     */
    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
