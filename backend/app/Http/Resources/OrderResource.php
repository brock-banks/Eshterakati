<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Only ever returned to the holder of the order's access token.
 * Plaintext codes are included once the order is paid.
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    public bool $withToken = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pay = $this->paymentDetails();
        $paid = $this->status === OrderStatus::Paid;

        return [
            'id' => $this->public_id,
            'reference' => $this->reference,
            'access_token' => $this->when($this->withToken, $this->access_token),
            'status' => $this->status,
            'currency' => $this->currency,
            'total_minor' => $this->total_minor,
            'created_at' => $this->created_at->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'review_time' => config('shop.review_hours'),
            'payment' => [
                'method' => $this->payment_method,
                'name' => $pay['name'] ?? $this->payment_method,
                'provider' => $pay['provider'] ?? null,
                'account_name' => $pay['account_name'] ?? null,
                'account_number' => $pay['account_number'] ?? null,
            ],
            'receipt_submitted_at' => $this->latestReceipt?->created_at->toIso8601String(),
            'items' => $this->items->map(fn ($item) => [
                'quantity' => $item->quantity,
                'unit_price_minor' => $item->unit_price_minor,
                'option' => ['id' => $item->option->id, 'label' => $item->option->label],
                'deal' => [
                    'slug' => $item->option->deal->slug,
                    'merchant' => $item->option->deal->merchant,
                    'title' => $item->option->deal->title,
                    'hue' => $item->option->deal->hue,
                ],
                'codes' => $paid
                    ? $item->codes->map(fn ($code) => [
                        'id' => $code->id,
                        'code' => $code->code,
                        'expires_at' => $code->expires_at?->toIso8601String(),
                    ])->values()
                    : [],
            ])->values(),
        ];
    }
}
