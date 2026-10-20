<?php

namespace Tests\Feature;

use App\Actions\ReviewReceipt;
use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\DealOption;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderCodes;
use App\Notifications\OrderPlaced;
use App\Notifications\PaymentRejected;
use App\Notifications\ReceiptSubmitted;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class OrderFlowTest extends TestCase
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
        config([
            'shop.admin_email' => 'owner@example.com',
            'shop.payment_methods.bankak.account_number' => '1234567',
            'shop.payment_methods.bankak.account_name' => 'Eshterakati Store',
        ]);
    }

    private function option(string $deal, int $index = 0): DealOption
    {
        return Deal::where('slug', $deal)->firstOrFail()->options[$index];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/v1/orders', [
            'phone' => '0912 345 678',
            'email' => 'buyer@example.com',
            'payment_method' => 'bankak',
            'items' => [['option_id' => $this->option('pixelforge-credit', 1)->id, 'quantity' => 2]],
            ...$overrides,
        ]);
    }

    private function uploadReceipt(TestResponse $order, string $reference = 'TX 4471 0098', int $width = 600): TestResponse
    {
        // Different sizes give different files, so their hashes differ.
        return $this->withHeader('X-Order-Token', $order->json('data.access_token'))
            ->post("/api/v1/orders/{$order->json('data.id')}/receipt", [
                'receipt' => UploadedFile::fake()->image('receipt.jpg', $width, 1200),
                'transaction_reference' => $reference,
            ], ['Accept' => 'application/json']);
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    public function test_placing_an_order_reserves_codes_and_returns_transfer_details(): void
    {
        $option = $this->option('pixelforge-credit', 1);

        $response = $this->placeOrder()
            ->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.currency', 'SDG')
            ->assertJsonPath('data.total_minor', $option->price_minor * 2)
            ->assertJsonPath('data.payment.account_number', '1234567')
            ->assertJsonPath('data.items.0.codes', []);

        $this->assertMatchesRegularExpression('/^ESH-[A-Z2-9]{5}$/', $response->json('data.reference'));
        $this->assertSame(40, strlen($response->json('data.access_token')));
        $this->assertSame(0, $option->availableCodes()->count());
        $this->assertSame(2, CouponCode::where('status', CouponCodeStatus::Reserved)->count());
        $this->assertSame('+249912345678', Order::first()->phone);
        Notification::assertSentOnDemand(OrderPlaced::class);
    }

    public function test_it_validates_contact_and_payment_method(): void
    {
        $this->placeOrder(['phone' => '12345', 'payment_method' => 'fawry'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone', 'payment_method']);

        // Email is optional.
        $this->placeOrder(['email' => '', 'phone' => '+249 123 456 789'])->assertCreated();
        Notification::assertNothingSent();
    }

    public function test_reserved_stock_cannot_be_oversold(): void
    {
        $this->placeOrder()->assertCreated();

        $this->placeOrder(['items' => [['option_id' => $this->option('pixelforge-credit', 1)->id, 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(["items.{$this->option('pixelforge-credit', 1)->id}"]);
    }

    public function test_orders_are_only_visible_with_their_token(): void
    {
        $order = $this->placeOrder();
        $url = "/api/v1/orders/{$order->json('data.id')}";

        $this->getJson($url)->assertNotFound();
        $this->withHeader('X-Order-Token', 'wrong')->getJson($url)->assertNotFound();
        $this->withHeader('X-Order-Token', $order->json('data.access_token'))->getJson($url)
            ->assertOk()
            ->assertJsonMissingPath('data.access_token');
    }

    public function test_uploading_a_receipt_queues_the_order_for_review(): void
    {
        $order = $this->placeOrder();

        $this->uploadReceipt($order)
            ->assertOk()
            ->assertJsonPath('data.status', 'in_review');

        $receipt = Order::first()->latestReceipt;
        $this->assertSame('TX44710098', $receipt->transaction_reference);
        Storage::disk('local')->assertExists($receipt->path);
        Notification::assertSentOnDemand(ReceiptSubmitted::class, fn ($n, $c, $notifiable) => $notifiable->routes['mail'] === 'owner@example.com');
    }

    public function test_a_receipt_cannot_pay_for_two_orders(): void
    {
        $first = $this->placeOrder();
        $this->uploadReceipt($first, 'TX-555-01')->assertOk();

        $second = $this->placeOrder(['items' => [['option_id' => $this->option('oasis-stays')->id, 'quantity' => 1]]]);
        $this->uploadReceipt($second, 'tx 555 01', width: 700)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);
    }

    public function test_receipts_must_be_images(): void
    {
        $order = $this->placeOrder();

        $this->withHeader('X-Order-Token', $order->json('data.access_token'))
            ->post("/api/v1/orders/{$order->json('data.id')}/receipt", [
                'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
                'transaction_reference' => 'TX123456',
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt']);
    }

    public function test_approving_a_receipt_delivers_the_codes(): void
    {
        $order = $this->placeOrder();
        $this->uploadReceipt($order);

        app(ReviewReceipt::class)->approve(Order::first(), $this->admin());

        $response = $this->withHeader('X-Order-Token', $order->json('data.access_token'))
            ->getJson("/api/v1/orders/{$order->json('data.id')}")
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonCount(2, 'data.items.0.codes');

        $this->assertMatchesRegularExpression('/^PIXE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/', $response->json('data.items.0.codes.0.code'));
        $this->assertSame(2, CouponCode::where('status', CouponCodeStatus::Sold)->count());
        $this->assertSame(31002, Deal::where('slug', 'pixelforge-credit')->value('sold_count'));
        Notification::assertSentOnDemand(OrderCodes::class);
    }

    public function test_codes_are_encrypted_at_rest(): void
    {
        $order = $this->placeOrder();
        $this->uploadReceipt($order);
        app(ReviewReceipt::class)->approve(Order::first(), $this->admin());

        $code = $this->withHeader('X-Order-Token', $order->json('data.access_token'))
            ->getJson("/api/v1/orders/{$order->json('data.id')}")
            ->json('data.items.0.codes.0');

        $raw = DB::table('coupon_codes')->where('id', $code['id'])->value('code');
        $this->assertStringNotContainsString($code['code'], $raw);
    }

    public function test_a_rejected_receipt_lets_the_customer_try_again(): void
    {
        $order = $this->placeOrder();
        $this->uploadReceipt($order);

        app(ReviewReceipt::class)->reject(Order::first(), $this->admin(), 'amount', 'We received SDG 5,000 less.');

        $this->withHeaders(['X-Order-Token' => $order->json('data.access_token'), 'Accept-Language' => 'en'])
            ->getJson("/api/v1/orders/{$order->json('data.id')}")
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.rejection_reason', __('shop.rejection.amount', locale: 'en').' We received SDG 5,000 less.');
        $this->assertSame(2, CouponCode::where('status', CouponCodeStatus::Reserved)->count());
        Notification::assertSentOnDemand(PaymentRejected::class);

        $this->uploadReceipt($order, 'TX-NEW-777', width: 640)->assertOk()->assertJsonPath('data.status', 'in_review');
    }

    public function test_unpaid_orders_expire_and_release_their_codes(): void
    {
        $order = $this->placeOrder();

        $this->travel(config('shop.payment_window_minutes') + 1)->minutes();
        $this->artisan('orders:expire')->assertSuccessful();

        $this->assertSame(OrderStatus::Expired, Order::first()->status);
        $this->assertSame(2, $this->option('pixelforge-credit', 1)->availableCodes()->count());
        $this->uploadReceipt($order)->assertUnprocessable()->assertJsonValidationErrors(['receipt']);
    }

    public function test_orders_in_review_do_not_expire(): void
    {
        $order = $this->placeOrder();
        $this->uploadReceipt($order);

        $this->travel(1)->days();
        $this->artisan('orders:expire')->assertSuccessful();

        $this->assertSame(OrderStatus::InReview, Order::first()->status);
    }

    public function test_only_admins_can_view_receipt_images(): void
    {
        $this->uploadReceipt($this->placeOrder());
        $receipt = Order::first()->latestReceipt;

        $this->get("/admin/receipts/{$receipt->id}")->assertForbidden();
        $this->actingAs(User::factory()->create())->get("/admin/receipts/{$receipt->id}")->assertForbidden();
        $this->actingAs($this->admin())->get("/admin/receipts/{$receipt->id}")->assertOk();
    }
}
