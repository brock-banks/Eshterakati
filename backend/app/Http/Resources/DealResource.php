<?php

namespace App\Http\Resources;

use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Deal */
class DealResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'category' => $this->category->slug,
            'merchant' => $this->merchant,
            'title' => $this->title,
            'blurb' => $this->blurb,
            'hue' => $this->hue,
            'region' => $this->region,
            'rating' => $this->rating,
            'reviews_count' => $this->reviews_count,
            'sold_count' => $this->sold_count,
            'is_featured' => $this->is_featured,
            'ends_at' => $this->ends_at?->toIso8601String(),
            'options' => DealOptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
