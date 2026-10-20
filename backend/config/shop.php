<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store currency
    |--------------------------------------------------------------------------
    |
    | ISO 4217 code for every price in the catalogue. Prices are stored in
    | minor units (1 SDG = 100 piastres).
    |
    */

    'currency' => env('SHOP_CURRENCY', 'SDG'),

    'code_validity_months' => (int) env('SHOP_CODE_VALIDITY_MONTHS', 12),

    'max_quantity_per_item' => 10,

    /*
    |--------------------------------------------------------------------------
    | Receipt payments
    |--------------------------------------------------------------------------
    |
    | Customers transfer the total from their banking app, then upload a
    | screenshot of the receipt. Codes stay reserved for `payment_window`
    | minutes; an admin approves the receipt in /admin.
    |
    */

    'payment_window_minutes' => (int) env('SHOP_PAYMENT_WINDOW_MINUTES', 180),

    // Shown to customers while their receipt is being checked.
    'review_hours' => env('SHOP_REVIEW_HOURS', 'usually within 30 minutes, 9am–11pm'),

    // Receives an email for every receipt that needs checking.
    'admin_email' => env('SHOP_ADMIN_EMAIL'),

    // Where customers' order links point (the Next.js storefront).
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    /*
    | Accounts customers can transfer to. A method is offered only when its
    | account number is set. Add more by copying an entry.
    */
    'payment_methods' => [
        'bankak' => [
            'name' => 'Bankak',
            'provider' => 'Bank of Khartoum',
            'account_name' => env('PAY_BANKAK_ACCOUNT_NAME'),
            'account_number' => env('PAY_BANKAK_ACCOUNT_NUMBER'),
        ],
        'ocash' => [
            'name' => 'O-Cash',
            'provider' => 'Omdurman National Bank',
            'account_name' => env('PAY_OCASH_ACCOUNT_NAME'),
            'account_number' => env('PAY_OCASH_ACCOUNT_NUMBER'),
        ],
        'fawry' => [
            'name' => 'Fawry',
            'provider' => 'Faisal Islamic Bank',
            'account_name' => env('PAY_FAWRY_ACCOUNT_NAME'),
            'account_number' => env('PAY_FAWRY_ACCOUNT_NUMBER'),
        ],
    ],

];
