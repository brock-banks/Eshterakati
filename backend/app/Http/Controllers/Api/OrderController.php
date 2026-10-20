<?php

namespace App\Http\Controllers\Api;

use App\Actions\PlaceOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Notifications\OrderCodes;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use Throwable;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request, PlaceOrder $placeOrder): JsonResponse
    {
        $order = $placeOrder->handle(
            $request->validated('email'),
            $request->validated('items'),
        );

        // The order is paid and the codes are shown on screen, so a mail failure must not fail the request.
        try {
            Notification::route('mail', $order->email)->notify(new OrderCodes($order));
        } catch (Throwable $e) {
            report($e);
        }

        return (new OrderResource($order))->response()->setStatusCode(201);
    }
}
