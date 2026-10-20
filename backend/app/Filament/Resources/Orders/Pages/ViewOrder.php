<?php

namespace App\Filament\Resources\Orders\Pages;

use App\Actions\ReviewReceipt;
use App\Enums\OrderStatus;
use App\Filament\Resources\Orders\OrderResource;
use App\Models\Order;
use App\Support\Money;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Icons\Heroicon;

/**
 * @property Order $record
 */
class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;

    /** Customer-facing reasons; they appear on the order page and in the email. */
    private const REJECTION_REASONS = [
        'not_received' => 'We couldn’t find this transfer in our account yet. If you sent it just now, wait a few minutes, then upload the receipt again.',
        'amount' => 'The amount on the receipt doesn’t match the order total. Transfer the remaining amount, then upload both receipts in one screenshot.',
        'unreadable' => 'We couldn’t read the receipt. Upload a clear screenshot that shows the amount, date and transaction number.',
        'wrong_account' => 'The transfer went to a different account. Check the account number on the order page and try again.',
    ];

    protected function getHeaderActions(): array
    {
        return [
            Action::make('approve')
                ->label('Approve & send codes')
                ->icon(Heroicon::OutlinedCheckCircle)
                ->color('success')
                ->visible(fn () => $this->record->status === OrderStatus::InReview)
                ->requiresConfirmation()
                ->modalHeading('Approve this payment?')
                ->modalDescription(fn () => 'Confirm you can see '.Money::format($this->record->total_minor, $this->record->currency)
                    ." from transaction {$this->record->latestReceipt?->transaction_reference} in the account. The customer gets their codes immediately.")
                ->modalSubmitActionLabel('Yes, money received')
                ->action(function (ReviewReceipt $review) {
                    $review->approve($this->record, auth()->user());
                    $this->record->refresh();
                    Notification::make()->success()->title("Codes delivered for {$this->record->reference}")->send();
                }),
            Action::make('reject')
                ->label('Reject receipt')
                ->icon(Heroicon::OutlinedXCircle)
                ->color('danger')
                ->visible(fn () => $this->record->status === OrderStatus::InReview)
                ->modalHeading('Reject this receipt?')
                ->modalDescription('The customer sees your reason and can upload a new receipt. Their codes stay reserved.')
                ->schema([
                    Select::make('reason')
                        ->options([
                            'not_received' => 'Transfer not in the account',
                            'amount' => 'Amount doesn’t match',
                            'unreadable' => 'Receipt is unreadable',
                            'wrong_account' => 'Sent to the wrong account',
                        ])
                        ->helperText('The customer sees a full explanation of the reason you pick.')
                        ->required(),
                    Textarea::make('note')
                        ->label('Add a note (optional, shown to the customer)')
                        ->maxLength(200),
                ])
                ->action(function (array $data, ReviewReceipt $review) {
                    $reason = trim(self::REJECTION_REASONS[$data['reason']].' '.($data['note'] ?? ''));
                    $review->reject($this->record, auth()->user(), $reason);
                    $this->record->refresh();
                    Notification::make()->warning()->title("Receipt rejected for {$this->record->reference}")->send();
                }),
        ];
    }
}
