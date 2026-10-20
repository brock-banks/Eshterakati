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
                        ->helperText('The customer sees a full explanation of this reason in their language (lang/*/shop.php).')
                        ->required(),
                    Textarea::make('note')
                        ->label('Add a note (optional, shown to the customer as written)')
                        ->maxLength(200),
                ])
                ->action(function (array $data, ReviewReceipt $review) {
                    $review->reject($this->record, auth()->user(), $data['reason'], $data['note'] ?? null);
                    $this->record->refresh();
                    Notification::make()->warning()->title("Receipt rejected for {$this->record->reference}")->send();
                }),
        ];
    }
}
