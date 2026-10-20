<?php

namespace App\Enums;

enum CouponCodeStatus: string
{
    case Available = 'available';
    case Sold = 'sold';
    case Disputed = 'disputed';
}
