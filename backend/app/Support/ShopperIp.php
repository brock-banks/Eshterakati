<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * The shopper behind an API request, for per-shopper rate limits.
 *
 * In production the storefront's server calls the API through the host's proxy, so the
 * connecting address is the storefront's, not the shopper's. The storefront proves itself
 * with a shared key (SHOP_STOREFRONT_KEY) and names the shopper in X-Shopper-IP; anyone
 * else is limited by the address they connect from.
 */
final class ShopperIp
{
    public static function of(Request $request): ?string
    {
        $key = (string) config('shop.storefront_key');
        $claimed = (string) $request->header('X-Shopper-IP');

        if ($key !== ''
            && hash_equals($key, (string) $request->header('X-Storefront-Key'))
            && filter_var($claimed, FILTER_VALIDATE_IP) !== false) {
            return $claimed;
        }

        return $request->ip();
    }
}
