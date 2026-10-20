<?php

namespace App\Enums;

enum CouponCodeStatus: string
{
    case Available = 'available';

    /** Held for an order that is waiting for payment or review. */
    case Reserved = 'reserved';
    case Sold = 'sold';
    case Disputed = 'disputed';
}
