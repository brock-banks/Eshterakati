<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Returned only from the purchase request: it is the one response that
 * carries plaintext codes.
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'email' => $this->email,
            'status' => $this->status,
            'currency' => $this->currency,
            'face_value_cents' => $this->face_value_cents,
            'total_cents' => $this->total_cents,
            'created_at' => $this->created_at->toIso8601String(),
            'codes' => $this->items->flatMap(fn ($item) => $item->codes->map(fn ($code) => [
                'id' => $code->id,
                'code' => $code->code,
                'expires_at' => $code->expires_at?->toIso8601String(),
                'option' => [
                    'id' => $item->option->id,
                    'label' => $item->option->label,
                    'face_value_cents' => $item->unit_face_value_cents,
                    'price_cents' => $item->unit_price_cents,
                ],
                'deal' => [
                    'slug' => $item->option->deal->slug,
                    'merchant' => $item->option->deal->merchant,
                    'title' => $item->option->deal->title,
                    'hue' => $item->option->deal->hue,
                ],
            ]))->values(),
        ];
    }
}
