<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/deals', [DealController::class, 'index']);
    Route::get('/deals/{slug}', [DealController::class, 'show']);
    Route::get('/payment-methods', [PaymentMethodController::class, 'index']);

    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->middleware('throttle:60,1');
    Route::post('/orders/{order}/receipt', [OrderController::class, 'receipt'])->middleware('throttle:10,1');
});
