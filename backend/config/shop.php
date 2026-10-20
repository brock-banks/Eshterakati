<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store currency
    |--------------------------------------------------------------------------
    |
    | ISO 4217 code for every price in the catalogue. Prices are stored in
    | minor units (cents), so switching to e.g. SAR only changes formatting.
    |
    */

    'currency' => env('SHOP_CURRENCY', 'USD'),

    /*
    |--------------------------------------------------------------------------
    | Code validity
    |--------------------------------------------------------------------------
    |
    | How long a code stays redeemable after purchase, unless the merchant
    | sets a shorter window.
    |
    */

    'code_validity_months' => (int) env('SHOP_CODE_VALIDITY_MONTHS', 12),

    'max_quantity_per_item' => 10,

];
