<?php

namespace App\Support;

use Illuminate\Support\Collection;

class PaymentMethods
{
    /**
     * Methods with a configured account, keyed by method id.
     *
     * @return Collection<string, array{key: string, name: string, provider: string, account_name: ?string, account_number: string}>
     */
    public static function enabled(): Collection
    {
        return collect(config('shop.payment_methods'))
            ->filter(fn (array $m) => filled($m['account_number'] ?? null))
            ->map(fn (array $m, string $key) => ['key' => $key, ...$m]);
    }

    /**
     * @return array{key: string, name: string, provider: string, account_name: ?string, account_number: string}|null
     */
    public static function find(string $key): ?array
    {
        return static::enabled()->get($key);
    }

    /**
     * A method's name and bank in the current locale.
     *
     * @param  array<string, mixed>  $method
     * @return array{name: string, provider: string}
     */
    public static function label(array $method): array
    {
        $ar = app()->getLocale() === 'ar';

        return [
            'name' => ($ar ? ($method['name_ar'] ?? null) : null) ?: $method['name'],
            'provider' => ($ar ? ($method['provider_ar'] ?? null) : null) ?: $method['provider'],
        ];
    }
}
