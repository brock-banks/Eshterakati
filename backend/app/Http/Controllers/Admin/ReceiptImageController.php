<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentReceipt;
use App\Models\ProblemReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Receipts and problem screenshots are private files; only admins can view them.
 */
class ReceiptImageController extends Controller
{
    public function __invoke(Request $request, PaymentReceipt $receipt): StreamedResponse
    {
        return $this->stream($request, $receipt->disk, $receipt->path);
    }

    public function screenshot(Request $request, ProblemReport $report): StreamedResponse
    {
        abort_unless($report->screenshot_path, 404);

        return $this->stream($request, 'local', $report->screenshot_path);
    }

    private function stream(Request $request, string $disk, string $path): StreamedResponse
    {
        abort_unless($request->user()?->is_admin, 403);

        return Storage::disk($disk)->response($path, headers: [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
