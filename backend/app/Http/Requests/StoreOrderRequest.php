<?php

namespace App\Http\Requests;

use App\Support\PaymentMethods;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    /**
     * Guest checkout: anyone may place an order.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Accept Sudanese numbers as people type them (0912…, 249912…, +249 91 2…) and store them as +249XXXXXXXXX.
     */
    protected function prepareForValidation(): void
    {
        $digits = preg_replace('/\D+/', '', (string) $this->input('phone'));
        $local = match (true) {
            str_starts_with($digits, '00249') => substr($digits, 5),
            str_starts_with($digits, '249') => substr($digits, 3),
            str_starts_with($digits, '0') => substr($digits, 1),
            default => $digits,
        };

        $this->merge([
            'phone' => $local === '' ? '' : "+249{$local}",
            'email' => filled($this->input('email')) ? trim($this->input('email')) : null,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'regex:/^\+249[19]\d{8}$/'],
            'email' => ['nullable', 'string', 'email:rfc', 'max:254'],
            'payment_method' => ['required', 'string', Rule::in(PaymentMethods::enabled()->keys())],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.option_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.config('shop.max_quantity_per_item')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'Enter your phone number so we can reach you about this order.',
            'phone.regex' => 'Enter a Sudanese mobile number, like 0912 345 678.',
            'email.email' => 'That email looks incomplete. Check for a missing “@” or domain.',
            'payment_method.in' => 'Choose how you’ll pay.',
        ];
    }
}
