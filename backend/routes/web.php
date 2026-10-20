<?php

use App\Http\Controllers\Admin\ReceiptImageController;
use Illuminate\Support\Facades\Route;

// The API has no pages of its own; send visitors to the shop.
Route::redirect('/', config('shop.frontend_url'));

// Private receipt images for the admin panel (session auth from Filament's login).
Route::get('/admin/receipts/{receipt}', ReceiptImageController::class)->name('admin.receipts.show');
Route::get('/admin/report-screenshots/{report}', [ReceiptImageController::class, 'screenshot'])->name('admin.reports.screenshot');
