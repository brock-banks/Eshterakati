<?php

namespace App\Http\Resources;

use App\Models\DealOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DealOption */
class DealOptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->localized('label'),
            'price_minor' => $this->price_minor,
            'compare_at_minor' => $this->discountPercent() ? $this->compare_at_minor : null,
            'discount_percent' => $this->discountPercent(),
            'in_stock' => $this->when(
                isset($this->available_codes_count),
                fn () => $this->available_codes_count > 0,
            ),
        ];
    }
}
