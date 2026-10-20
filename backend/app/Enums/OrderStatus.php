<?php

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum OrderStatus: string implements HasColor, HasLabel
{
    /** Codes are reserved; waiting for the customer to transfer and upload a receipt. */
    case AwaitingPayment = 'awaiting_payment';

    /** A receipt was uploaded; waiting for an admin to check it against the bank statement. */
    case InReview = 'in_review';
    case Paid = 'paid';

    /** No receipt arrived before the deadline; codes went back to stock. */
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    public function getLabel(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'Awaiting payment',
            self::InReview => 'In review',
            self::Paid => 'Paid',
            self::Expired => 'Expired',
            self::Cancelled => 'Cancelled',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'gray',
            self::InReview => 'warning',
            self::Paid => 'success',
            self::Expired, self::Cancelled => 'danger',
        };
    }
}
