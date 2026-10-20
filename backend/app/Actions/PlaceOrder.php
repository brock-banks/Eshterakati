<?php

namespace App\Actions;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Models\CouponCode;
use App\Models\DealOption;
use App\Models\Order;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    private const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    /**
     * Create an order awaiting payment and reserve its codes, so stock is held
     * while the customer makes the transfer.
     *
     * @param  list<array{option_id: int, quantity: int}>  $items
     *
     * @throws ValidationException when an option is unavailable or out of stock
     */
    public function handle(string $phone, ?string $email, string $paymentMethod, array $items): Order
    {
        $quantities = collect($items)
            ->groupBy('option_id')
            ->map(fn (Collection $lines) => (int) $lines->sum('quantity'));

        return DB::transaction(function () use ($phone, $email, $paymentMethod, $quantities) {
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
                'reference' => $this->uniqueReference(),
                'access_token' => Str::random(40),
                'phone' => $phone,
                'email' => $email,
                'status' => OrderStatus::AwaitingPayment,
                'currency' => config('shop.currency'),
                'total_minor' => $quantities->sum(fn ($qty, $id) => $options[$id]->price_minor * $qty),
                'payment_method' => $paymentMethod,
                'expires_at' => now()->addMinutes(config('shop.payment_window_minutes')),
            ]);

            foreach ($quantities as $optionId => $quantity) {
                $item = $order->items()->create([
                    'deal_option_id' => $optionId,
                    'quantity' => $quantity,
                    'unit_price_minor' => $options[$optionId]->price_minor,
                ]);

                CouponCode::whereKey($reserved[$optionId]->modelKeys())->update([
                    'status' => CouponCodeStatus::Reserved,
                    'order_item_id' => $item->id,
                ]);
            }

            return $order->load('items.option.deal');
        });
    }

    /**
     * Short code the customer writes in the transfer note, e.g. "ESH-7K4QP".
     */
    private function uniqueReference(): string
    {
        do {
            $suffix = collect(range(1, 5))
                ->map(fn () => self::REFERENCE_ALPHABET[random_int(0, strlen(self::REFERENCE_ALPHABET) - 1)])
                ->implode('');
            $reference = "ESH-{$suffix}";
        } while (Order::where('reference', $reference)->exists());

        return $reference;
    }
}
