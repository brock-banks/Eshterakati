<?php

namespace Tests\Feature;

use App\Actions\ResolveReport;
use App\Actions\ReviewReceipt;
use App\Enums\CouponCodeStatus;
use App\Enums\ReportStatus;
use App\Filament\Resources\ProblemReports\Pages\ViewProblemReport;
use App\Models\CouponCode;
use App\Models\Deal;
use App\Models\Order;
use App\Models\ProblemReport;
use App\Models\User;
use App\Notifications\ProblemReported;
use App\Notifications\ReportResolved;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Livewire\Livewire;
use RuntimeException;
use Tests\TestCase;

class ProblemReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private string $token;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 3;
        $seeder->run();

        Storage::fake('local');
        Notification::fake();
        config([
            'shop.admin_email' => 'owner@example.com',
            'shop.payment_methods.bankak.account_number' => '1234567',
        ]);
        $this->admin = User::factory()->create(['is_admin' => true]);

        // A paid order for one code.
        $placed = $this->withHeader('Accept-Language', 'ar')->postJson('/api/v1/orders', [
            'phone' => '0912345678',
            'email' => 'buyer@example.com',
            'payment_method' => 'bankak',
            'items' => [['option_id' => Deal::where('slug', 'pixelforge-credit')->first()->options[1]->id, 'quantity' => 1]],
        ])->assertCreated();
        $this->token = $placed->json('data.access_token');
        $this->order = Order::firstOrFail();
        $this->withHeader('X-Order-Token', $this->token)->post("/api/v1/orders/{$this->order->public_id}/receipt", [
            'receipt' => UploadedFile::fake()->image('r.jpg', 600, 1200),
            'transaction_reference' => 'TX123456',
        ], ['Accept' => 'application/json'])->assertOk();
        app(ReviewReceipt::class)->approve($this->order->refresh(), $this->admin);
    }

    private function code(): CouponCode
    {
        return $this->order->codes()->orderBy('coupon_codes.id')->firstOrFail();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function report(array $data = [], ?CouponCode $code = null, string $lang = 'ar'): TestResponse
    {
        $code ??= $this->code();

        return $this->withHeaders(['X-Order-Token' => $this->token, 'Accept-Language' => $lang])
            ->post("/api/v1/orders/{$this->order->public_id}/codes/{$code->id}/report", [
                'reason' => 'invalid',
                'preference' => 'replacement',
                ...$data,
            ], ['Accept' => 'application/json']);
    }

    public function test_a_customer_can_report_a_code_with_a_screenshot(): void
    {
        $this->report(['details' => 'Store says invalid', 'screenshot' => UploadedFile::fake()->image('err.png', 400, 800)])
            ->assertOk()
            ->assertJsonPath('data.items.0.codes.0.report.status', 'open')
            ->assertJsonPath('data.items.0.codes.0.report.response_time', 'عادةً خلال يوم عمل واحد');

        $report = ProblemReport::firstOrFail();
        $this->assertSame('ar', $report->locale);
        Storage::disk('local')->assertExists($report->screenshot_path);
        Notification::assertSentOnDemand(ProblemReported::class);
    }

    public function test_refund_requests_need_an_account_and_are_encrypted(): void
    {
        $this->report(['preference' => 'refund'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.refund_account_number.0', 'أدخل رقم الحساب لاسترداد المبلغ.')
            ->assertJsonValidationErrors(['refund_method', 'refund_account_name']);

        $this->report(['preference' => 'refund', 'refund_method' => 'bankak', 'refund_account_number' => '99 88 77 66', 'refund_account_name' => 'Ahmed Ali'])
            ->assertOk();

        $this->assertSame('99887766', ProblemReport::first()->refund_account_number);
        $this->assertStringNotContainsString('99887766', (string) DB::table('problem_reports')->value('refund_account_number'));
    }

    public function test_reports_are_guarded(): void
    {
        // Wrong token.
        $this->withHeader('X-Order-Token', 'nope')
            ->postJson("/api/v1/orders/{$this->order->public_id}/codes/{$this->code()->id}/report", ['reason' => 'invalid', 'preference' => 'replacement'])
            ->assertNotFound();

        // A code from someone else's stock.
        $other = CouponCode::where('status', CouponCodeStatus::Available)->first();
        $this->report([], $other, 'en')->assertUnprocessable()->assertJsonPath('errors.reason.0', 'This code can’t be reported.');

        // "Other" needs details.
        $this->report(['reason' => 'other'], null, 'en')->assertUnprocessable()->assertJsonValidationErrors(['details']);

        // Only once.
        $this->report()->assertOk();
        $this->report([], null, 'en')->assertUnprocessable()->assertJsonPath('errors.reason.0', 'This code has already been reported.');
    }

    public function test_reports_close_after_the_window(): void
    {
        $this->travel(config('shop.report_window_days') + 1)->days();

        $this->report([], null, 'en')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);
        $this->assertStringContainsString('30 days', $this->report([], null, 'en')->json('errors.reason.0'));
    }

    public function test_a_replacement_retires_the_code_and_delivers_a_new_one(): void
    {
        $this->report();
        $original = $this->code();

        app(ResolveReport::class)->replace(ProblemReport::first(), $this->admin);

        $codes = $this->withHeaders(['X-Order-Token' => $this->token, 'Accept-Language' => 'en'])
            ->getJson("/api/v1/orders/{$this->order->public_id}")
            ->assertJsonCount(2, 'data.items.0.codes')
            ->json('data.items.0.codes');

        $this->assertSame('disputed', $codes[0]['status']);
        $this->assertSame('replaced', $codes[0]['report']['status']);
        $this->assertSame('sold', $codes[1]['status']);
        $this->assertSame($codes[1]['id'], $codes[0]['report']['replacement_code_id']);
        $this->assertSame(CouponCodeStatus::Disputed, $original->refresh()->status);

        Notification::assertSentOnDemand(ReportResolved::class, function (ReportResolved $n, array $channels, AnonymousNotifiable $notifiable) use ($codes) {
            app()->setLocale($n->locale);

            return $n->locale === 'ar' && str_contains((string) $n->toMail($notifiable)->render(), $codes[1]['code']);
        });
    }

    public function test_replacing_without_stock_fails_cleanly(): void
    {
        $this->report();
        CouponCode::where('status', CouponCodeStatus::Available)->update(['status' => CouponCodeStatus::Disputed]);

        $this->expectException(RuntimeException::class);
        try {
            app(ResolveReport::class)->replace(ProblemReport::first(), $this->admin);
        } finally {
            $this->assertSame(ReportStatus::Open, ProblemReport::first()->status);
            $this->assertSame(CouponCodeStatus::Sold, $this->code()->status);
        }
    }

    public function test_a_refund_is_recorded_and_shown(): void
    {
        $this->report(['preference' => 'refund', 'refund_method' => 'bankak', 'refund_account_number' => '55443322', 'refund_account_name' => 'Ahmed Ali']);

        app(ResolveReport::class)->refund(ProblemReport::first(), $this->admin, 16_200_000, 'BK-998877');

        $this->withHeaders(['X-Order-Token' => $this->token])
            ->getJson("/api/v1/orders/{$this->order->public_id}")
            ->assertJsonPath('data.items.0.codes.0.status', 'disputed')
            ->assertJsonPath('data.items.0.codes.0.report.status', 'refunded')
            ->assertJsonPath('data.items.0.codes.0.report.refund_amount_minor', 16_200_000)
            ->assertJsonPath('data.items.0.codes.0.report.refund_reference', 'BK-998877');

        Notification::assertSentOnDemand(ReportResolved::class, function (ReportResolved $n, array $channels, AnonymousNotifiable $notifiable) {
            app()->setLocale($n->locale);
            $html = (string) $n->toMail($notifiable)->render();

            return str_contains($html, 'BK-998877') && str_contains($html, '3322') && ! str_contains($html, '55443322');
        });
    }

    public function test_a_declined_report_explains_why_in_the_customers_language(): void
    {
        $this->report();

        app(ResolveReport::class)->decline(ProblemReport::first(), $this->admin, 'works', 'Try the US store.');

        $this->withHeaders(['X-Order-Token' => $this->token, 'Accept-Language' => 'ar'])
            ->getJson("/api/v1/orders/{$this->order->public_id}")
            ->assertJsonPath('data.items.0.codes.0.status', 'sold')
            ->assertJsonPath('data.items.0.codes.0.report.message', __('shop.report.decline.works', locale: 'ar').' Try the US store.');
    }

    public function test_admin_resolves_reports_in_the_panel(): void
    {
        $this->report(['preference' => 'refund', 'refund_method' => 'bankak', 'refund_account_number' => '55443322', 'refund_account_name' => 'Ahmed Ali']);
        $report = ProblemReport::first();

        $this->actingAs($this->admin);
        $this->get("/admin/problem-reports/{$report->id}")->assertOk()->assertSee($this->code()->code);

        Livewire::test(ViewProblemReport::class, ['record' => $report->id])
            ->callAction('refund', ['reference' => 'BK-1'])
            ->assertHasNoActionErrors();
        $this->assertSame(ReportStatus::Refunded, $report->refresh()->status);
        $this->assertSame($this->code()->orderItem->unit_price_minor, $report->refund_amount_minor);
    }

    public function test_admin_replace_action_reports_missing_stock(): void
    {
        $this->report();
        CouponCode::where('status', CouponCodeStatus::Available)->update(['status' => CouponCodeStatus::Disputed]);

        $this->actingAs($this->admin);
        Livewire::test(ViewProblemReport::class, ['record' => ProblemReport::first()->id])
            ->callAction('replace')
            ->assertNotified('Couldn’t replace');
        $this->assertSame(ReportStatus::Open, ProblemReport::first()->status);
    }
}
