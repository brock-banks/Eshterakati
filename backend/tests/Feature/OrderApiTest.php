<?php

namespace Tests\Feature;

use App\Enums\CouponCodeStatus;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\DealOption;
use App\Notifications\OrderCodes;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 2;
        $seeder->run();
    }

    private function option(string $deal, int $index = 0): DealOption
    {
        return Deal::where('slug', $deal)->firstOrFail()->options[$index];
    }

    public function test_it_sells_codes_from_inventory(): void
    {
        $credit = $this->option('pixelforge-credit', 1); // $50 for $42
        $pass = $this->option('questline-pass');          // $29.99 for $22.49

        $response = $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [
                ['option_id' => $credit->id, 'quantity' => 2],
                ['option_id' => $pass->id, 'quantity' => 1],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.total_cents', 4200 * 2 + 2249)
            ->assertJsonPath('data.face_value_cents', 5000 * 2 + 2999)
            ->assertJsonCount(3, 'data.codes')
            ->assertJsonPath('data.codes.0.deal.merchant', 'PixelForge');

        $this->assertMatchesRegularExpression('/^PIXE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/', $response->json('data.codes.0.code'));
        $this->assertSame(0, $credit->availableCodes()->count());
        $this->assertSame(2, CouponCode::where('deal_option_id', $credit->id)->where('status', CouponCodeStatus::Sold)->count());
        $this->assertSame(31002, Deal::where('slug', 'pixelforge-credit')->value('sold_count'));
    }

    public function test_it_emails_the_codes(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [['option_id' => $this->option('oasis-stays')->id, 'quantity' => 1]],
        ])->assertCreated();

        Notification::assertSentOnDemand(OrderCodes::class, function (OrderCodes $n, array $channels, AnonymousNotifiable $notifiable) use ($response) {
            $mail = $n->toMail($notifiable)->render();

            return $notifiable->routes['mail'] === 'buyer@example.com'
                && str_contains($mail, $response->json('data.codes.0.code'));
        });
    }

    public function test_codes_are_encrypted_at_rest(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [['option_id' => $this->option('oasis-stays')->id, 'quantity' => 1]],
        ])->assertCreated();

        $code = $response->json('data.codes.0.code');
        $raw = DB::table('coupon_codes')->where('id', $response->json('data.codes.0.id'))->value('code');

        $this->assertNotSame($code, $raw);
        $this->assertStringNotContainsString($code, $raw);
    }

    public function test_it_refuses_to_oversell(): void
    {
        $option = $this->option('dune-air');

        $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [['option_id' => $option->id, 'quantity' => 3]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(["items.{$option->id}"]);

        $this->assertSame(2, $option->availableCodes()->count());
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_it_refuses_ended_deals(): void
    {
        $option = $this->option('noteworthy-pro');
        Deal::where('slug', 'noteworthy-pro')->update(['ends_at' => now()->subMinute()]);

        $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [['option_id' => $option->id, 'quantity' => 1]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(["items.{$option->id}" => 'This deal is no longer available.']);
    }

    public function test_it_validates_the_request(): void
    {
        $this->postJson('/api/v1/orders', ['email' => 'not-an-email', 'items' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'items']);

        $this->postJson('/api/v1/orders', [
            'email' => 'buyer@example.com',
            'items' => [['option_id' => $this->option('oasis-stays')->id, 'quantity' => 11]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.quantity']);
    }
}
