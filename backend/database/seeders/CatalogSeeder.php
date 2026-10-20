<?php

namespace Database\Seeders;

use App\Enums\CouponCodeStatus;
use App\Models\Category;
use App\Models\CouponCode;
use App\Models\Deal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo catalogue. Merchants are fictional placeholders, not real brands.
 */
class CatalogSeeder extends Seeder
{
    /** Codes generated per option. */
    public int $codesPerOption = 25;

    private const CATEGORIES = [
        ['slug' => 'streaming', 'name' => 'Streaming', 'icon' => 'tv', 'hue' => 262, 'blurb' => 'TV, film and music subscriptions.'],
        ['slug' => 'gaming', 'name' => 'Gaming', 'icon' => 'gamepad', 'hue' => 217, 'blurb' => 'Store credit, season passes and in‑game currency.'],
        ['slug' => 'food', 'name' => 'Food & Delivery', 'icon' => 'utensils', 'hue' => 22, 'blurb' => 'Restaurants, groceries and delivery credit.'],
        ['slug' => 'shopping', 'name' => 'Shopping', 'icon' => 'tag', 'hue' => 330, 'blurb' => 'Fashion, electronics and home.'],
        ['slug' => 'travel', 'name' => 'Travel', 'icon' => 'plane', 'hue' => 192, 'blurb' => 'Flights, stays and rides.'],
        ['slug' => 'software', 'name' => 'Apps & Software', 'icon' => 'layers', 'hue' => 150, 'blurb' => 'Productivity, security and cloud storage.'],
    ];

    /**
     * Placeholder exchange rate for demo prices only. Real prices are set per option in /admin.
     */
    private const DEMO_SDG_PER_USD = 3000;

    /** [slug, category, merchant, title, blurb, hue, region, rating, reviews, sold, featured, ends in hours, options [label, USD value, on sale]] */
    private const DEALS = [
        ['lumen-premium', 'streaming', 'Lumen TV', 'Premium plan', 'Ad‑free 4K streaming on up to four screens, with downloads.', 262, 'Worldwide', 4.8, 2140, 12400, true, 30,
            [['1 month', 15.99, false], ['3 months', 47.97, false], ['12 months', 191.88, true]]],
        ['tempo-family', 'streaming', 'Tempo Music', 'Family plan', 'Six accounts, offline listening and lossless audio.', 335, 'Worldwide', 4.7, 860, 5200, false, null,
            [['3 months', 50.97, false], ['6 months', 101.94, false]]],
        ['pixelforge-credit', 'gaming', 'PixelForge', 'Store credit', 'Spend on games, DLC and add‑ons in the PixelForge store.', 217, 'Worldwide', 4.9, 5310, 31000, false, 5,
            [['$25', 25, false], ['$50', 50, false], ['$100', 100, true]]],
        ['questline-pass', 'gaming', 'Questline', 'Season Pass', 'Unlock the full season: 100 tiers of rewards and two new maps.', 284, 'Worldwide', 4.6, 1200, 8800, false, 52,
            [['Season 12', 29.99, true]]],
        ['nomad-eats', 'food', 'Nomad Eats', 'Delivery credit', 'Order from thousands of restaurants. Credit never expires.', 18, 'Worldwide', 4.5, 3020, 14000, false, 9,
            [['$20', 20, false], ['$40', 40, false]]],
        ['fresh-basket', 'food', 'Fresh Basket', 'Grocery voucher', 'Fresh produce and pantry staples delivered same‑day.', 112, 'GCC only', 4.6, 940, 4100, false, null,
            [['$30', 30, false], ['$60', 60, false]]],
        ['atelier-gift', 'shopping', 'Atelier', 'Gift card', 'Fashion, beauty and home from 400+ designers.', 350, 'Worldwide', 4.7, 1500, 6900, false, null,
            [['$50', 50, false], ['$100', 100, false], ['$200', 200, false]]],
        ['circuit-voucher', 'shopping', 'Circuit', 'Electronics voucher', 'Phones, laptops and accessories — online or in store.', 200, 'Worldwide', 4.4, 410, 1900, false, 70,
            [['$100', 100, false], ['$250', 250, true]]],
        ['dune-air', 'travel', 'Dune Air', 'Flight voucher', 'Use toward any fare on 120 routes. Taxes included.', 32, 'GCC & Europe', 4.5, 280, 1300, false, 20,
            [['$150', 150, false], ['$300', 300, false]]],
        ['oasis-stays', 'travel', 'Oasis Stays', 'Hotel credit', 'Book boutique hotels and resorts in 60 countries.', 172, 'Worldwide', 4.6, 610, 2700, false, null,
            [['$100', 100, false]]],
        ['noteworthy-pro', 'software', 'Noteworthy', 'Pro · 1 year', 'Unlimited notes, sync across devices and AI search.', 44, 'Worldwide', 4.8, 990, 7600, false, 4,
            [['1 year', 59.99, true]]],
        ['vaultline-vpn', 'software', 'Vaultline VPN', 'VPN subscription', 'Private browsing on unlimited devices. No‑logs policy.', 150, 'Worldwide', 4.7, 2200, 9900, false, null,
            [['1 year', 71.88, false], ['2 years', 143.76, true]]],
    ];

    /** No 0/O or 1/I, so codes are easy to read aloud and retype. */
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function run(): void
    {
        $categories = collect(self::CATEGORIES)
            ->map(fn (array $c, int $i) => Category::updateOrCreate(['slug' => $c['slug']], [...$c, 'sort_order' => $i]))
            ->keyBy('slug');

        foreach (self::DEALS as [$slug, $cat, $merchant, $title, $blurb, $hue, $region, $rating, $reviews, $sold, $featured, $endsIn, $options]) {
            $deal = Deal::updateOrCreate(['slug' => $slug], [
                'category_id' => $categories[$cat]->id,
                'merchant' => $merchant,
                'title' => $title,
                'blurb' => $blurb,
                'hue' => $hue,
                'region' => $region,
                'rating' => $rating,
                'reviews_count' => $reviews,
                'sold_count' => $sold,
                'is_featured' => $featured,
                'ends_at' => $endsIn ? now()->addHours($endsIn) : null,
            ]);

            foreach ($options as $i => [$label, $usd, $onSale]) {
                $price = $this->demoPrice($usd);
                $option = $deal->options()->updateOrCreate(['label' => $label], [
                    'price_minor' => $price,
                    'compare_at_minor' => $onSale ? $this->roundSdg($price / 100 * 1.15) * 100 : null,
                    'sort_order' => $i,
                ]);

                $missing = $this->codesPerOption - $option->availableCodes()->count();
                for ($n = 0; $n < $missing; $n++) {
                    CouponCode::create([
                        'deal_option_id' => $option->id,
                        'code' => $this->makeCode($merchant),
                        'status' => CouponCodeStatus::Available,
                    ]);
                }
            }
        }
    }

    /** Price in SDG minor units: USD value at the demo rate plus an 8% margin, rounded to 500 SDG. */
    private function demoPrice(float $usd): int
    {
        return $this->roundSdg($usd * self::DEMO_SDG_PER_USD * 1.08) * 100;
    }

    private function roundSdg(float $pounds): int
    {
        return (int) (round($pounds / 500) * 500);
    }

    private function makeCode(string $merchant): string
    {
        $prefix = Str::upper(Str::substr(preg_replace('/[^A-Za-z]/', '', $merchant), 0, 4));
        $group = fn () => collect(range(1, 4))->map(fn () => self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)])->implode('');

        return "{$prefix}-{$group()}-{$group()}-{$group()}";
    }
}
