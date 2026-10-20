<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\PaymentMethods;
use Illuminate\Http\JsonResponse;

class PaymentMethodController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => PaymentMethods::enabled()
                ->map(fn (array $m) => ['key' => $m['key'], ...PaymentMethods::label($m)])
                ->values(),
        ]);
    }
}
