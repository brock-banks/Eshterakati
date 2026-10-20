<?php

namespace App\Models;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Support\PaymentMethods;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'reference', 'access_token', 'phone', 'email', 'locale', 'status', 'currency', 'total_minor',
    'payment_method', 'expires_at', 'rejection_code', 'rejection_note', 'paid_at', 'reviewed_by',
])]
#[Hidden(['access_token'])]
class Order extends Model
{
    use HasUlids;

    /**
     * The ULID is the public identifier; the numeric id stays internal.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            // Encrypted (not hashed) so later emails can still carry the order link.
            'access_token' => 'encrypted',
            'status' => OrderStatus::class,
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasManyThrough<CouponCode, OrderItem, $this>
     */
    public function codes(): HasManyThrough
    {
        return $this->hasManyThrough(CouponCode::class, OrderItem::class);
    }

    /**
     * @return HasMany<PaymentReceipt, $this>
     */
    public function receipts(): HasMany
    {
        return $this->hasMany(PaymentReceipt::class)->latest('id');
    }

    /**
     * @return HasOne<PaymentReceipt, $this>
     */
    public function latestReceipt(): HasOne
    {
        return $this->hasOne(PaymentReceipt::class)->latestOfMany();
    }

    /**
     * @return HasMany<ProblemReport, $this>
     */
    public function problemReports(): HasMany
    {
        return $this->hasMany(ProblemReport::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function tokenMatches(?string $token): bool
    {
        return is_string($token) && $token !== '' && hash_equals($this->access_token, $token);
    }

    /**
     * @return array{key: string, name: string, provider: string, account_name: ?string, account_number: string}|null
     */
    public function paymentDetails(): ?array
    {
        return PaymentMethods::find($this->payment_method);
    }

    public function orderUrl(): string
    {
        return rtrim(config('shop.frontend_url'), '/')."/{$this->locale}/orders/{$this->public_id}?t={$this->access_token}";
    }

    /**
     * Why the last receipt was rejected, in the current locale, followed by the admin's note.
     */
    public function rejectionMessage(): ?string
    {
        if (! $this->rejection_code) {
            return null;
        }

        return trim(__("shop.rejection.{$this->rejection_code}").' '.$this->rejection_note);
    }

    /**
     * The payment deadline as customers in Sudan read it, e.g. "5:57 PM, Oct 20".
     */
    public function deadlineForHumans(): string
    {
        $locale = app()->getLocale();

        return $this->expires_at->timezone(config('shop.timezone'))->locale($locale)
            ->isoFormat($locale === 'ar' ? 'h:mm A، D MMMM' : 'h:mm A, MMM D');
    }

    /**
     * Expire an unpaid order whose payment window has passed and return its codes to stock.
     * Orders with a receipt in review never expire on their own.
     */
    public function expireIfDue(): bool
    {
        if ($this->status !== OrderStatus::AwaitingPayment || ! $this->expires_at?->isPast()) {
            return false;
        }

        DB::transaction(function () {
            $this->update(['status' => OrderStatus::Expired]);
            CouponCode::whereIn('order_item_id', $this->items()->pluck('id'))
                ->where('status', CouponCodeStatus::Reserved)
                ->update(['status' => CouponCodeStatus::Available, 'order_item_id' => null]);
        });

        return true;
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
