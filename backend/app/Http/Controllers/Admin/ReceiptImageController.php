<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Receipts are private files; only admins can view them.
 */
class ReceiptImageController extends Controller
{
    public function __invoke(Request $request, PaymentReceipt $receipt): StreamedResponse
    {
        abort_unless($request->user()?->is_admin, 403);

        return Storage::disk($receipt->disk)->response($receipt->path, headers: [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
