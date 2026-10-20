<?php

namespace App\Http\Controllers\Api;

use App\Actions\PlaceOrder;
use App\Actions\SubmitReceipt;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\StoreReceiptRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Notifications\OrderPlaced;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Throwable;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request, PlaceOrder $placeOrder): JsonResponse
    {
        $order = $placeOrder->handle(
            $request->validated('phone'),
            $request->validated('email'),
            $request->validated('payment_method'),
            $request->validated('items'),
        );

        if ($order->email) {
            // The order exists either way; a mail failure must not fail the request.
            try {
                Notification::route('mail', $order->email)->notify(new OrderPlaced($order));
            } catch (Throwable $e) {
                report($e);
            }
        }

        $resource = new OrderResource($order);
        $resource->withToken = true;

        return $resource->response()->setStatusCode(201);
    }

    public function show(Request $request, Order $order): OrderResource
    {
        $this->authorizeToken($request, $order);
        $order->expireIfDue();

        return new OrderResource($order->load('items.option.deal', 'items.codes', 'latestReceipt'));
    }

    public function receipt(StoreReceiptRequest $request, Order $order, SubmitReceipt $submitReceipt): OrderResource
    {
        $this->authorizeToken($request, $order);

        $order = $submitReceipt->handle($order, $request->file('receipt'), $request->validated('transaction_reference'));

        return new OrderResource($order->load('items.option.deal', 'items.codes', 'latestReceipt'));
    }

    /**
     * Guests prove ownership with the token issued at checkout. A wrong token looks like a missing order.
     */
    private function authorizeToken(Request $request, Order $order): void
    {
        abort_unless($order->tokenMatches($request->header('X-Order-Token')), 404);
    }
}
