<?php

namespace App\Support;

use Illuminate\Support\Number;

class Money
{
    /**
     * Whole pounds in the current locale, always with Western digits so amounts
     * match what people type into their banking apps.
     */
    public static function format(int $minor, ?string $currency = null): string
    {
        $locale = app()->getLocale() === 'ar' ? 'ar@numbers=latn' : 'en';

        return Number::currency($minor / 100, $currency ?? config('shop.currency'), $locale, precision: 0);
    }
}
