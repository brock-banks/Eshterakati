<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Support\PaymentMethods;
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
        $label = $pay ? PaymentMethods::label($pay) : null;
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
            'rejection_reason' => $this->rejectionMessage(),
            'review_time' => config('shop.review_hours.'.app()->getLocale()) ?? config('shop.review_hours.en'),
            'payment' => [
                'method' => $this->payment_method,
                'name' => $label['name'] ?? $this->payment_method,
                'provider' => $label['provider'] ?? null,
                'account_name' => $pay['account_name'] ?? null,
                'account_number' => $pay['account_number'] ?? null,
            ],
            'receipt_submitted_at' => $this->latestReceipt?->created_at->toIso8601String(),
            'items' => $this->items->map(fn ($item) => [
                'quantity' => $item->quantity,
                'unit_price_minor' => $item->unit_price_minor,
                'option' => ['id' => $item->option->id, 'label' => $item->option->localized('label')],
                'deal' => [
                    'slug' => $item->option->deal->slug,
                    'merchant' => $item->option->deal->merchant,
                    'title' => $item->option->deal->localized('title'),
                    'hue' => $item->option->deal->hue,
                ],
                'codes' => $paid
                    ? $item->codes->sortBy('id')->map(fn ($code) => [
                        'id' => $code->id,
                        'code' => $code->code,
                        'expires_at' => $code->expires_at?->toIso8601String(),
                        // "disputed" once a report was resolved with a replacement or refund.
                        'status' => $code->status,
                        'reportable_until' => $code->reportableUntil()?->toIso8601String(),
                        'report' => $code->report ? [
                            'status' => $code->report->status,
                            'reason' => $code->report->reason,
                            'preference' => $code->report->preference,
                            'created_at' => $code->report->created_at->toIso8601String(),
                            'resolved_at' => $code->report->resolved_at?->toIso8601String(),
                            'message' => $code->report->customerMessage(),
                            'replacement_code_id' => $code->report->replacement_code_id,
                            'refund_amount_minor' => $code->report->refund_amount_minor,
                            'refund_reference' => $code->report->refund_reference,
                            'response_time' => config('shop.report_response_time.'.app()->getLocale()) ?? config('shop.report_response_time.en'),
                        ] : null,
                    ])->values()
                    : [],
            ])->values(),
        ];
    }
}
