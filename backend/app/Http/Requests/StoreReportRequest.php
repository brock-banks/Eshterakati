<?php

namespace App\Http\Requests;

use App\Models\ProblemReport;
use App\Support\PaymentMethods;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportRequest extends FormRequest
{
    /**
     * Access is checked against the order token in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $refund = 'required_if:preference,refund';

        return [
            'reason' => ['required', Rule::in(ProblemReport::REASONS)],
            'details' => ['nullable', 'required_if:reason,other', 'string', 'max:1000'],
            'screenshot' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'preference' => ['required', Rule::in(ProblemReport::PREFERENCES)],
            'refund_method' => ['nullable', $refund, Rule::in(PaymentMethods::enabled()->keys())],
            'refund_account_number' => ['nullable', $refund, 'string', 'min:4', 'max:40'],
            'refund_account_name' => ['nullable', $refund, 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('shop.report.validation.reason'),
            'reason.in' => __('shop.report.validation.reason'),
            'details.required_if' => __('shop.report.validation.details_required'),
            'screenshot.*' => __('shop.report.validation.screenshot_image'),
            'preference.*' => __('shop.report.validation.preference'),
            'refund_method.*' => __('shop.report.validation.refund_method'),
            'refund_account_number.*' => __('shop.report.validation.refund_account_number'),
            'refund_account_name.*' => __('shop.report.validation.refund_account_name'),
        ];
    }
}
