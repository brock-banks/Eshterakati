<?php

// Customer-facing copy from the API and emails. Keep in step with lang/ar/shop.php.
return [

    'validation' => [
        'phone_required' => 'Enter your phone number so we can reach you about this order.',
        'phone_invalid' => 'Enter a Sudanese mobile number, like 0912 345 678.',
        'email_invalid' => 'That email looks incomplete. Check for a missing “@” or domain.',
        'payment_method' => 'Choose how you’ll pay.',
        'items_required' => 'Your bag is empty.',
        'quantity_max' => 'You can buy up to :max of each item.',
        'receipt_required' => 'Add a screenshot or photo of your transfer receipt.',
        'receipt_image' => 'The receipt must be an image (JPG, PNG or WebP).',
        'receipt_max' => 'That image is larger than 8 MB. Try a screenshot instead of a photo.',
        'reference_required' => 'Enter the transaction number shown on the receipt.',
        'reference_short' => 'Copy the transaction number exactly as it appears on the receipt.',
    ],

    'order' => [
        'unavailable' => 'This deal is no longer available.',
        'sold_out' => ':item is sold out.',
        'only_left' => 'Only :count left of :item.',
    ],

    'receipt' => [
        'expired' => 'This order expired before a receipt arrived, and its codes were released. If you already transferred the money, contact us with your receipt and we’ll sort it out.',
        'not_waiting' => 'This order isn’t waiting for a payment.',
        'reused' => 'This receipt has already been used for another order. If you think that’s a mistake, contact us.',
    ],

    'rejection' => [
        'not_received' => 'We couldn’t find this transfer in our account yet. If you sent it just now, wait a few minutes, then upload the receipt again.',
        'amount' => 'The amount on the receipt doesn’t match the order total. Transfer the remaining amount, then upload both receipts in one screenshot.',
        'unreadable' => 'We couldn’t read the receipt. Upload a clear screenshot that shows the amount, date and transaction number.',
        'wrong_account' => 'The transfer went to a different account. Check the account number on the order page and try again.',
    ],

    'mail' => [
        'salutation' => 'The Eshterakati team',
        'placed' => [
            'subject' => 'Complete your payment · :reference',
            'greeting' => 'Your codes are reserved',
            'transfer' => 'Transfer **:amount** with :method (:provider):',
            'account' => 'Account number: **:number**',
            'note' => 'Write **:reference** in the transfer note.',
            'deadline' => 'Then upload a screenshot of the receipt before :time.',
            'action' => 'Upload receipt',
        ],
        'rejected' => [
            'subject' => 'We couldn’t confirm your payment · :reference',
            'greeting' => 'We couldn’t confirm your payment',
            'still_reserved' => 'Your codes are still reserved until :time. Upload a new receipt to finish your order.',
            'action' => 'Upload a new receipt',
        ],
        'codes' => [
            'subject' => 'Your codes are ready · :reference',
            'greeting' => 'Payment confirmed — your codes are ready',
            'keep_safe' => 'Keep this email somewhere safe. Each code works once.',
            'total' => 'Total paid: :amount',
            'action' => 'View your order',
            'refund' => 'If a code doesn’t work, reply to this email within 30 days for a full refund.',
        ],
    ],

    'report' => [
        'validation' => [
            'reason' => 'Choose what went wrong.',
            'details_required' => 'Tell us what happened.',
            'screenshot_image' => 'The screenshot must be an image (JPG, PNG or WebP) under 8 MB.',
            'preference' => 'Choose a replacement code or a refund.',
            'refund_method' => 'Choose where to send your refund.',
            'refund_account_number' => 'Enter the account number for your refund.',
            'refund_account_name' => 'Enter the account holder’s name.',
        ],
        'window_closed' => 'Problems can be reported within :days days of purchase. This code was bought on :date.',
        'already_reported' => 'This code has already been reported.',
        'not_reportable' => 'This code can’t be reported.',
        'decline' => [
            'already_redeemed' => 'The merchant confirmed this code was already redeemed on an account. If that wasn’t you, contact the merchant’s support with the code.',
            'works' => 'We tested this code and it works. Make sure you’re redeeming it in the right store and region, exactly as shown.',
            'region_stated' => 'This code only works for accounts in the region shown on the deal page before purchase, so it can’t be refunded.',
            'other' => 'We couldn’t accept this report.',
        ],
        'mail' => [
            'replaced' => [
                'subject' => 'Your replacement code · :reference',
                'greeting' => 'Here’s your replacement code',
                'intro' => 'We’re sorry :item didn’t work. Your new code:',
                'action' => 'View your codes',
            ],
            'refunded' => [
                'subject' => 'Your refund was sent · :reference',
                'greeting' => 'Your refund is on its way',
                'intro' => 'We sent :amount to your :method account ending :last4. Transfer reference: :transfer.',
            ],
            'declined' => [
                'subject' => 'About your report · :reference',
                'greeting' => 'We checked your report',
            ],
        ],
    ],

];
