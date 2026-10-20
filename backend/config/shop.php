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

    // Requests per minute per shopper (by IP, forwarded by the storefront; see TRUSTED_PROXIES).
    'rate_limits' => [
        'place-order' => (int) env('SHOP_LIMIT_ORDERS', 10),
        'upload-receipt' => (int) env('SHOP_LIMIT_RECEIPTS', 10),
        'report-problem' => (int) env('SHOP_LIMIT_REPORTS', 5),
        'order-status' => (int) env('SHOP_LIMIT_STATUS', 120),
    ],

    // Customers can report a code that doesn't work for this many days after purchase.
    'report_window_days' => (int) env('SHOP_REPORT_WINDOW_DAYS', 30),

    // Shown to customers after they report a problem, in each storefront language.
    'report_response_time' => [
        'en' => env('SHOP_REPORT_RESPONSE', 'usually within 1 business day'),
        'ar' => env('SHOP_REPORT_RESPONSE_AR', 'عادةً خلال يوم عمل واحد'),
    ],

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

    // Shown to customers while their receipt is being checked, in each storefront language.
    'review_hours' => [
        'en' => env('SHOP_REVIEW_HOURS', 'usually within 30 minutes, 9am–11pm'),
        'ar' => env('SHOP_REVIEW_HOURS_AR', 'عادةً خلال 30 دقيقة، من 9 صباحًا حتى 11 مساءً'),
    ],

    // Times in customer emails (payment deadlines) are written in this zone.
    'timezone' => env('SHOP_TIMEZONE', 'Africa/Khartoum'),

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
            'name_ar' => 'بنكك',
            'provider' => 'Bank of Khartoum',
            'provider_ar' => 'بنك الخرطوم',
            'account_name' => env('PAY_BANKAK_ACCOUNT_NAME'),
            'account_number' => env('PAY_BANKAK_ACCOUNT_NUMBER'),
        ],
        'ocash' => [
            'name' => 'O-Cash',
            'name_ar' => 'أوكاش',
            'provider' => 'Omdurman National Bank',
            'provider_ar' => 'بنك أم درمان الوطني',
            'account_name' => env('PAY_OCASH_ACCOUNT_NAME'),
            'account_number' => env('PAY_OCASH_ACCOUNT_NUMBER'),
        ],
        'fawry' => [
            'name' => 'Fawry',
            'name_ar' => 'فوري',
            'provider' => 'Faisal Islamic Bank',
            'provider_ar' => 'بنك فيصل الإسلامي',
            'account_name' => env('PAY_FAWRY_ACCOUNT_NAME'),
            'account_number' => env('PAY_FAWRY_ACCOUNT_NUMBER'),
        ],
    ],

];
