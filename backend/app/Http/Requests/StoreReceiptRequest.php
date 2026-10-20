<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReceiptRequest extends FormRequest
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
        return [
            'receipt' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'transaction_reference' => ['required', 'string', 'min:4', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'receipt.required' => __('shop.validation.receipt_required'),
            'receipt.file' => __('shop.validation.receipt_required'),
            'receipt.image' => __('shop.validation.receipt_image'),
            'receipt.mimes' => __('shop.validation.receipt_image'),
            'receipt.max' => __('shop.validation.receipt_max'),
            'transaction_reference.required' => __('shop.validation.reference_required'),
            'transaction_reference.min' => __('shop.validation.reference_short'),
            'transaction_reference.max' => __('shop.validation.reference_short'),
        ];
    }
}
