<?php

namespace App\Actions;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\DealOption;
use App\Models\Order;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    /**
     * Create a paid order and assign codes from inventory.
     *
     * Payment capture is stubbed: the order is marked paid immediately.
     * Integrate a payment provider before launch (see docs/UX-SPEC.md, "Open decisions").
     *
     * @param  list<array{option_id: int, quantity: int}>  $items
     *
     * @throws ValidationException when an option is unavailable or out of stock
     */
    public function handle(string $email, array $items): Order
    {
        // Merge repeated lines for the same option so stock is checked once.
        $quantities = collect($items)
            ->groupBy('option_id')
            ->map(fn (Collection $lines) => (int) $lines->sum('quantity'));

        return DB::transaction(function () use ($email, $quantities) {
            $options = DealOption::query()
                ->whereIn('id', $quantities->keys())
                ->whereHas('deal', fn ($q) => $q->listed())
                ->with('deal')
                ->get()
                ->keyBy('id');

            $errors = [];
            $reserved = [];

            foreach ($quantities as $optionId => $quantity) {
                $option = $options->get($optionId);

                if (! $option) {
                    $errors["items.{$optionId}"] = 'This deal is no longer available.';

                    continue;
                }

                $codes = CouponCode::query()
                    ->where('deal_option_id', $optionId)
                    ->where('status', CouponCodeStatus::Available)
                    ->orderBy('id')
                    ->limit($quantity)
                    ->lockForUpdate()
                    ->get();

                if ($codes->count() < $quantity) {
                    $errors["items.{$optionId}"] = $codes->isEmpty()
                        ? "{$option->deal->merchant} {$option->label} is sold out."
                        : "Only {$codes->count()} left of {$option->deal->merchant} {$option->label}.";

                    continue;
                }

                $reserved[$optionId] = $codes;
            }

            if ($errors) {
                throw ValidationException::withMessages($errors);
            }

            $order = Order::create([
                'email' => $email,
                'status' => OrderStatus::Paid,
                'currency' => config('shop.currency'),
                'face_value_cents' => $quantities->sum(fn ($qty, $id) => $options[$id]->face_value_cents * $qty),
                'total_cents' => $quantities->sum(fn ($qty, $id) => $options[$id]->price_cents * $qty),
                'paid_at' => now(),
            ]);

            foreach ($quantities as $optionId => $quantity) {
                $option = $options[$optionId];

                $item = $order->items()->create([
                    'deal_option_id' => $optionId,
                    'quantity' => $quantity,
                    'unit_price_cents' => $option->price_cents,
                    'unit_face_value_cents' => $option->face_value_cents,
                ]);

                CouponCode::whereKey($reserved[$optionId]->modelKeys())->update([
                    'status' => CouponCodeStatus::Sold,
                    'order_item_id' => $item->id,
                    'sold_at' => now(),
                    'expires_at' => now()->addMonths(config('shop.code_validity_months')),
                ]);

                Deal::whereKey($option->deal_id)->increment('sold_count', $quantity);
            }

            return $order->load('items.option.deal', 'items.codes');
        });
    }
}
