<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Category */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->localized('name'),
            'icon' => $this->icon,
            'hue' => $this->hue,
            'blurb' => $this->localized('blurb'),
            'deals_count' => $this->whenCounted('deals'),
        ];
    }
}
