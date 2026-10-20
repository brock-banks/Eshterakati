<?php

namespace App\Models;

use App\Enums\ReceiptStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['order_id', 'disk', 'path', 'mime', 'size', 'sha256', 'transaction_reference', 'status'])]
class PaymentReceipt extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReceiptStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Bank transaction numbers are compared on letters and digits only, ignoring case,
     * so "TX-555-01" and "tx 555 01" are the same transfer.
     */
    public static function normalizeReference(string $reference): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $reference));
    }
}
