<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeployTest extends TestCase
{
    use RefreshDatabase;

    public function test_shop_admin_creates_the_admin_once_and_keeps_its_password(): void
    {
        config(['shop.admin_email' => 'owner@example.com', 'shop.admin_password' => 'first-password']);

        $this->artisan('shop:admin')->assertSuccessful();
        $admin = User::where('email', 'owner@example.com')->firstOrFail();
        $this->assertTrue($admin->is_admin);

        // Redeploys run it again; a password changed since then must survive.
        $admin->update(['password' => 'changed-later']);
        config(['shop.admin_password' => 'first-password']);
        $this->artisan('shop:admin')->assertSuccessful();

        $this->assertTrue(password_verify('changed-later', $admin->fresh()->password));
        $this->assertSame(1, User::count());
    }

    public function test_shop_admin_skips_without_credentials(): void
    {
        config(['shop.admin_email' => null, 'shop.admin_password' => null]);

        $this->artisan('shop:admin')->assertSuccessful();
        $this->assertSame(0, User::count());
    }

    public function test_the_root_url_sends_visitors_to_the_shop(): void
    {
        $this->get('/')->assertRedirect(config('shop.frontend_url'));
    }

    public function test_behind_a_hosting_proxy_urls_use_the_forwarded_https_address(): void
    {
        // TRUSTED_PROXIES=* is read in bootstrap/app.php, so boot a fresh app with it.
        putenv('TRUSTED_PROXIES=*');
        $this->refreshApplication();
        putenv('TRUSTED_PROXIES');

        $this->serverVariables = ['REMOTE_ADDR' => '100.64.0.2'];
        $this->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'api.example.com', 'X-Forwarded-Port' => '443'])
            ->get('/admin/login')
            ->assertOk()
            ->assertSee('https://api.example.com/css/filament', false);
    }
}
