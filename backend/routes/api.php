<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/deals', [DealController::class, 'index']);
    Route::get('/deals/{slug}', [DealController::class, 'show']);

    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1');
});
