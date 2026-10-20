<?php

namespace Tests\Feature;

use App\Models\Deal;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 15;
        $seeder->run();

        Notification::fake();
        config(['shop.payment_methods.bankak.account_number' => '1234567']);
    }

    /** Requests arrive from the storefront (127.0.0.1) on behalf of a shopper. */
    private function placeOrderAs(string $shopperIp): TestResponse
    {
        return $this->withHeader('X-Forwarded-For', $shopperIp)->postJson('/api/v1/orders', [
            'phone' => '0912345678',
            'payment_method' => 'bankak',
            'items' => [['option_id' => Deal::where('slug', 'oasis-stays')->first()->options[0]->id, 'quantity' => 1]],
        ]);
    }

    public function test_limits_apply_per_shopper_not_to_the_whole_storefront(): void
    {
        $limit = config('shop.rate_limits.place-order');
        for ($i = 0; $i < $limit; $i++) {
            $this->placeOrderAs('197.252.1.10')->assertCreated();
        }

        $this->placeOrderAs('197.252.1.10')->assertTooManyRequests();
        $this->placeOrderAs('41.95.7.20')->assertCreated();
    }

    public function test_status_polling_does_not_use_up_the_order_allowance(): void
    {
        $order = $this->placeOrderAs('197.252.1.10')->assertCreated();

        for ($i = 0; $i < 20; $i++) {
            $this->withHeaders(['X-Forwarded-For' => '197.252.1.10', 'X-Order-Token' => $order->json('data.access_token')])
                ->getJson("/api/v1/orders/{$order->json('data.id')}")
                ->assertOk();
        }

        $this->placeOrderAs('197.252.1.10')->assertCreated();
    }

    public function test_forwarded_ips_from_untrusted_sources_are_ignored(): void
    {
        $limit = config('shop.rate_limits.place-order');
        // Not coming from the storefront: the spoofed header must not buy a fresh allowance.
        $this->serverVariables = ['REMOTE_ADDR' => '203.0.113.9'];
        for ($i = 0; $i < $limit; $i++) {
            $this->placeOrderAs('10.0.0.'.$i)->assertCreated();
        }
        $this->placeOrderAs('10.0.0.99')->assertTooManyRequests();
    }

    /** In production the storefront reaches the API through the host's proxy and names the shopper with its key. */
    private function placeOrderViaProxy(string $shopperIp, string $key): TestResponse
    {
        $this->serverVariables = ['REMOTE_ADDR' => '100.64.0.2'];

        return $this->withHeaders(['X-Storefront-Key' => $key, 'X-Shopper-IP' => $shopperIp])->postJson('/api/v1/orders', [
            'phone' => '0912345678',
            'payment_method' => 'bankak',
            'items' => [['option_id' => Deal::where('slug', 'oasis-stays')->first()->options[0]->id, 'quantity' => 1]],
        ]);
    }

    public function test_the_storefront_key_lets_the_api_limit_each_shopper_behind_a_proxy(): void
    {
        config(['shop.storefront_key' => 'secret-key']);
        $limit = config('shop.rate_limits.place-order');
        for ($i = 0; $i < $limit; $i++) {
            $this->placeOrderViaProxy('197.252.1.10', 'secret-key')->assertCreated();
        }

        $this->placeOrderViaProxy('197.252.1.10', 'secret-key')->assertTooManyRequests();
        $this->placeOrderViaProxy('41.95.7.20', 'secret-key')->assertCreated();
    }

    public function test_a_wrong_storefront_key_does_not_buy_a_fresh_allowance(): void
    {
        config(['shop.storefront_key' => 'secret-key']);
        $limit = config('shop.rate_limits.place-order');
        for ($i = 0; $i < $limit; $i++) {
            $this->placeOrderViaProxy('10.0.0.'.$i, 'guess')->assertCreated();
        }

        $this->placeOrderViaProxy('10.0.0.99', 'guess')->assertTooManyRequests();
    }
}
