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
            'receipt.required' => 'Add a screenshot or photo of your transfer receipt.',
            'receipt.image' => 'The receipt must be an image (JPG, PNG or WebP).',
            'receipt.mimes' => 'The receipt must be an image (JPG, PNG or WebP).',
            'receipt.max' => 'That image is larger than 8 MB. Try a screenshot instead of a photo.',
            'transaction_reference.required' => 'Enter the transaction number shown on the receipt.',
            'transaction_reference.min' => 'That transaction number looks too short. Copy it exactly as it appears on the receipt.',
        ];
    }
}
