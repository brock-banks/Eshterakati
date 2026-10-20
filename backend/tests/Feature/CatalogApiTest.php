<?php

namespace Tests\Feature;

use App\Models\Deal;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $seeder = new CatalogSeeder;
        $seeder->codesPerOption = 2;
        $seeder->run();
    }

    public function test_it_lists_categories_with_deal_counts(): void
    {
        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(6, 'data')
            ->assertJsonPath('data.0.slug', 'streaming')
            ->assertJsonPath('data.0.deals_count', 2);
    }

    public function test_it_lists_deals_by_popularity_by_default(): void
    {
        $this->getJson('/api/v1/deals')
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('data.0.slug', 'pixelforge-credit')
            ->assertJsonStructure(['data' => [['slug', 'category', 'merchant', 'options' => [['id', 'label', 'price_minor', 'compare_at_minor', 'discount_percent']]]]]);
    }

    public function test_it_filters_by_category_and_search_terms(): void
    {
        $this->getJson('/api/v1/deals?category=gaming')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/deals?q=gift card')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'atelier-gift');
    }

    public function test_it_sorts_deals_on_sale_first_by_savings(): void
    {
        $deals = $this->getJson('/api/v1/deals?sort=savings')->assertOk()->json('data');

        $this->assertNotNull(collect($deals[0]['options'])->max('discount_percent'));
        $this->assertNull(collect(end($deals)['options'])->max('discount_percent'));
    }

    public function test_it_hides_ended_and_inactive_deals(): void
    {
        Deal::where('slug', 'noteworthy-pro')->update(['ends_at' => now()->subMinute()]);
        Deal::where('slug', 'atelier-gift')->update(['is_active' => false]);

        $this->getJson('/api/v1/deals')->assertJsonCount(10, 'data');
        $this->getJson('/api/v1/deals/noteworthy-pro')->assertNotFound();
        $this->getJson('/api/v1/deals/atelier-gift')->assertNotFound();
    }

    public function test_it_shows_a_deal_with_stock_flags(): void
    {
        $this->getJson('/api/v1/deals/lumen-premium')
            ->assertOk()
            ->assertJsonPath('data.merchant', 'Lumen TV')
            ->assertJsonPath('data.category', 'streaming')
            ->assertJsonCount(3, 'data.options')
            ->assertJsonPath('data.options.0.in_stock', true)
            ->assertJsonPath('data.options.0.discount_percent', null)
            ->assertJsonPath('data.options.0.compare_at_minor', null)
            ->assertJsonPath('data.options.2.discount_percent', 13);
    }

    public function test_it_rejects_unknown_filters(): void
    {
        $this->getJson('/api/v1/deals?sort=cheapest')->assertUnprocessable();
        $this->getJson('/api/v1/deals?category=nope')->assertUnprocessable();
    }
}
