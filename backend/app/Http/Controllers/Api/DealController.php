<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DealResource;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DealController extends Controller
{
    /**
     * List deals. Filters: q, category, featured. Sort: popular (default), savings, ending.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'exists:categories,slug'],
            'featured' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:popular,savings,ending'],
        ]);

        $deals = Deal::query()
            ->listed()
            ->with(['category', 'options'])
            ->when($validated['category'] ?? null, fn ($q, $slug) => $q->whereRelation('category', 'slug', $slug))
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->when($validated['q'] ?? null, function ($q, $search) {
                foreach (preg_split('/\s+/', trim($search)) as $term) {
                    $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                    $q->where(fn ($w) => $w->whereLike('merchant', $like)
                        ->orWhereLike('title', $like)
                        ->orWhereLike('blurb', $like)
                        ->orWhereRelation('category', 'name', 'like', $like));
                }
            })
            ->limit(100)
            ->get();

        $deals = match ($validated['sort'] ?? 'popular') {
            'savings' => $deals->sortByDesc(fn (Deal $d) => $d->options->max(fn ($o) => $o->discountPercent() ?? 0)),
            'ending' => $deals->sortBy(fn (Deal $d) => $d->ends_at?->getTimestamp() ?? PHP_INT_MAX),
            default => $deals->sortByDesc('sold_count'),
        };

        return DealResource::collection($deals->values());
    }

    public function show(string $slug): DealResource
    {
        $deal = Deal::query()
            ->listed()
            ->where('slug', $slug)
            ->with(['category', 'options' => fn ($q) => $q->withCount('availableCodes')])
            ->firstOrFail();

        return new DealResource($deal);
    }
}
