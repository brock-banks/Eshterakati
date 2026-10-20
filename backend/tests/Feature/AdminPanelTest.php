<?php

namespace Tests\Feature;

use App\Enums\CouponCodeStatus;
use App\Enums\OrderStatus;
use App\Filament\Resources\Deals\Pages\EditDeal;
use App\Filament\Resources\Orders\Pages\ListOrders;
use App\Filament\Resources\Orders\Pages\ViewOrder;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 2;
        $seeder->run();

        Storage::fake('local');
        Notification::fake();
        config(['shop.payment_methods.bankak.account_number' => '1234567']);

        $this->admin = User::factory()->create(['is_admin' => true]);
    }

    private function orderInReview(): Order
    {
        $order = $this->postJson('/api/v1/orders', [
            'phone' => '0912345678',
            'payment_method' => 'bankak',
            'items' => [['option_id' => Deal::where('slug', 'oasis-stays')->first()->options[0]->id, 'quantity' => 1]],
        ])->assertCreated();

        $this->withHeader('X-Order-Token', $order->json('data.access_token'))
            ->post("/api/v1/orders/{$order->json('data.id')}/receipt", [
                'receipt' => UploadedFile::fake()->image('r.jpg', 600, 1200),
                'transaction_reference' => 'TX99887766',
            ], ['Accept' => 'application/json'])
            ->assertOk();

        return Order::firstOrFail();
    }

    public function test_only_admins_can_open_the_panel(): void
    {
        $this->get('/admin')->assertRedirect();
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs($this->admin)->get('/admin')->assertOk();
    }

    public function test_the_review_queue_lists_orders_in_review_first(): void
    {
        $order = $this->orderInReview();

        $this->actingAs($this->admin);
        Livewire::test(ListOrders::class)->assertCanSeeTableRecords([$order]);
        $this->get("/admin/orders/{$order->public_id}")->assertOk()->assertSee('TX99887766');
    }

    public function test_admin_can_approve_a_receipt(): void
    {
        $order = $this->orderInReview();

        $this->actingAs($this->admin);
        Livewire::test(ViewOrder::class, ['record' => $order->public_id])
            ->callAction('approve')
            ->assertHasNoActionErrors();

        $this->assertSame(OrderStatus::Paid, $order->refresh()->status);
        $this->assertSame($this->admin->id, $order->reviewed_by);
    }

    public function test_admin_can_reject_a_receipt_with_a_reason(): void
    {
        $order = $this->orderInReview();

        $this->actingAs($this->admin);
        Livewire::test(ViewOrder::class, ['record' => $order->public_id])
            ->callAction('reject', ['reason' => 'amount', 'note' => 'We received SDG 5,000 less.'])
            ->assertHasNoActionErrors();

        $order->refresh();
        $this->assertSame(OrderStatus::AwaitingPayment, $order->status);
        $this->assertStringContainsString('doesn’t match the order total', $order->rejection_reason);
        $this->assertStringEndsWith('We received SDG 5,000 less.', $order->rejection_reason);
    }

    public function test_admin_can_add_codes_to_stock(): void
    {
        $deal = Deal::where('slug', 'questline-pass')->first();
        $option = $deal->options[0];

        $this->actingAs($this->admin);
        Livewire::test(EditDeal::class, ['record' => $deal->slug])
            ->callAction('addCodes', ['option_id' => $option->id, 'codes' => "QUES-AAAA-BBBB-CCCC\n\n QUES-DDDD-EEEE-FFFF \nQUES-AAAA-BBBB-CCCC"])
            ->assertHasNoActionErrors();

        $this->assertSame(4, $option->availableCodes()->count());
        $this->assertSame('QUES-DDDD-EEEE-FFFF', CouponCode::where('deal_option_id', $option->id)->latest('id')->first()->code);
        $this->assertSame(CouponCodeStatus::Available, CouponCode::latest('id')->first()->status);
    }
}
