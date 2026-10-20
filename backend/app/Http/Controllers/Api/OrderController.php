<?php

namespace App\Http\Controllers\Api;

use App\Actions\PlaceOrder;
use App\Actions\ReportProblem;
use App\Actions\SubmitReceipt;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\StoreReceiptRequest;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\OrderResource;
use App\Models\CouponCode;
use App\Models\Order;
use App\Notifications\OrderPlaced;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Throwable;

class OrderController extends Controller
{
    private const WITH = ['items.option.deal', 'items.codes.report', 'latestReceipt'];

    public function store(StoreOrderRequest $request, PlaceOrder $placeOrder): JsonResponse
    {
        $order = $placeOrder->handle(
            $request->validated('phone'),
            $request->validated('email'),
            $request->validated('payment_method'),
            $request->validated('items'),
            app()->getLocale(),
        );

        if ($order->email) {
            // The order exists either way; a mail failure must not fail the request.
            try {
                Notification::route('mail', $order->email)->notify((new OrderPlaced($order))->locale($order->locale));
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

        return new OrderResource($order->load(self::WITH));
    }

    public function receipt(StoreReceiptRequest $request, Order $order, SubmitReceipt $submitReceipt): OrderResource
    {
        $this->authorizeToken($request, $order);

        $order = $submitReceipt->handle($order, $request->file('receipt'), $request->validated('transaction_reference'));

        return new OrderResource($order->load(self::WITH));
    }

    /**
     * Report that one of the order's codes doesn't work.
     */
    public function report(StoreReportRequest $request, Order $order, CouponCode $code, ReportProblem $reportProblem): OrderResource
    {
        $this->authorizeToken($request, $order);

        $reportProblem->handle($order, $code, $request->validated(), $request->file('screenshot'));

        return new OrderResource($order->load(self::WITH));
    }

    /**
     * Guests prove ownership with the token issued at checkout. A wrong token looks like a missing order.
     */
    private function authorizeToken(Request $request, Order $order): void
    {
        abort_unless($order->tokenMatches($request->header('X-Order-Token')), 404);
    }
}
