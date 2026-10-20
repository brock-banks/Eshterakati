<?php

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum ReportStatus: string implements HasColor, HasLabel
{
    case Open = 'open';
    case Replaced = 'replaced';
    case Refunded = 'refunded';
    case Declined = 'declined';

    public function getLabel(): string
    {
        return ucfirst($this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Open => 'warning',
            self::Replaced, self::Refunded => 'success',
            self::Declined => 'gray',
        };
    }
}
