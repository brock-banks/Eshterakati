<?php

namespace Tests\Feature;

use App\Actions\ReviewReceipt;
use App\Models\Deal;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlaced;
use App\Notifications\PaymentRejected;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 2;
        $seeder->run();

        Storage::fake('local');
        Notification::fake();
        config(['shop.payment_methods.bankak.account_number' => '1234567']);
    }

    private function placeArabicOrder(): TestResponse
    {
        return $this->withHeader('Accept-Language', 'ar')->postJson('/api/v1/orders', [
            'phone' => '0912345678',
            'email' => 'buyer@example.com',
            'payment_method' => 'bankak',
            'items' => [['option_id' => Deal::where('slug', 'lumen-premium')->first()->options[0]->id, 'quantity' => 1]],
        ])->assertCreated();
    }

    public function test_the_catalogue_is_served_in_arabic_with_english_fallback(): void
    {
        $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/deals/lumen-premium')
            ->assertHeader('Content-Language', 'ar')
            ->assertJsonPath('data.title', 'الباقة المميزة')
            ->assertJsonPath('data.region', 'جميع الدول')
            ->assertJsonPath('data.merchant', 'Lumen TV')
            ->assertJsonPath('data.options.0.label', 'شهر واحد');

        // "$25" has no Arabic label, so the English one is used.
        $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/deals/pixelforge-credit')
            ->assertJsonPath('data.options.0.label', '$25');

        $this->withHeader('Accept-Language', 'en')->getJson('/api/v1/categories')
            ->assertJsonPath('data.0.name', 'Streaming');
        $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/categories')
            ->assertJsonPath('data.0.name', 'البث والترفيه');
        $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/payment-methods')
            ->assertJsonPath('data.0.name', 'بنكك')
            ->assertJsonPath('data.0.provider', 'بنك الخرطوم');
    }

    public function test_unsupported_languages_fall_back_to_english(): void
    {
        $this->withHeader('Accept-Language', 'fr-FR')->getJson('/api/v1/deals/lumen-premium')
            ->assertHeader('Content-Language', 'en')
            ->assertJsonPath('data.title', 'Premium plan');
    }

    public function test_validation_messages_follow_the_request_language(): void
    {
        $this->withHeader('Accept-Language', 'ar')->postJson('/api/v1/orders', ['phone' => '123'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.phone.0', 'أدخل رقم جوال سوداني، مثل 0912 345 678.')
            ->assertJsonPath('errors.items.0', 'حقيبتك فارغة.');
    }

    public function test_orders_remember_their_language_for_emails_and_links(): void
    {
        $this->placeArabicOrder();
        $order = Order::first();

        $this->assertSame('ar', $order->locale);
        $this->assertStringContainsString('/ar/orders/'.$order->public_id.'?t=', $order->orderUrl());

        Notification::assertSentOnDemand(OrderPlaced::class, function (OrderPlaced $n, array $channels, AnonymousNotifiable $notifiable) {
            $this->assertSame('ar', $n->locale);
            app()->setLocale($n->locale);
            $html = (string) $n->toMail($notifiable)->render();

            return str_contains($html, 'dir="rtl"')
                && str_contains($html, 'حجزنا أكوادك')
                && str_contains($html, '52,000');
        });
    }

    public function test_rejection_reasons_are_shown_in_the_viewers_language(): void
    {
        $placed = $this->placeArabicOrder();
        $this->withHeader('X-Order-Token', $placed->json('data.access_token'))
            ->post("/api/v1/orders/{$placed->json('data.id')}/receipt", [
                'receipt' => UploadedFile::fake()->image('r.jpg', 600, 1200),
                'transaction_reference' => 'TX123456',
            ], ['Accept' => 'application/json'])->assertOk();

        app(ReviewReceipt::class)->reject(Order::first(), User::factory()->create(['is_admin' => true]), 'unreadable');

        $this->withHeaders(['X-Order-Token' => $placed->json('data.access_token'), 'Accept-Language' => 'ar'])
            ->getJson("/api/v1/orders/{$placed->json('data.id')}")
            ->assertJsonPath('data.rejection_reason', __('shop.rejection.unreadable', locale: 'ar'))
            ->assertJsonPath('data.payment.name', 'بنكك');

        Notification::assertSentOnDemand(PaymentRejected::class, fn (PaymentRejected $n) => $n->locale === 'ar');
    }
}
