<?php

namespace App\Support;

use Illuminate\Support\Number;

class Money
{
    public static function format(int $minor, ?string $currency = null): string
    {
        return Number::currency($minor / 100, $currency ?? config('shop.currency'), precision: 0);
    }
}
