<?php

namespace App\Filament\Resources\ProblemReports\Pages;

use App\Actions\ResolveReport;
use App\Enums\ReportStatus;
use App\Filament\Resources\ProblemReports\ProblemReportResource;
use App\Models\ProblemReport;
use App\Support\PaymentMethods;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Icons\Heroicon;
use RuntimeException;

/**
 * @property ProblemReport $record
 */
class ViewProblemReport extends ViewRecord
{
    protected static string $resource = ProblemReportResource::class;

    protected function getHeaderActions(): array
    {
        $open = fn () => $this->record->status === ReportStatus::Open;
        $note = fn () => Textarea::make('note')
            ->label('Note to the customer (optional, shown as written)')
            ->maxLength(300);

        return [
            Action::make('replace')
                ->label('Send replacement')
                ->icon(Heroicon::OutlinedArrowPath)
                ->color('success')
                ->visible($open)
                ->modalHeading('Send a replacement code?')
                ->modalDescription(fn () => 'The next code in stock for '.$this->record->code->option->label
                    .' goes to the customer, and the reported code is retired. '
                    .$this->record->code->option->availableCodes()->count().' in stock.')
                ->schema([$note()])
                ->action(function (array $data, ResolveReport $resolve, Action $action) {
                    try {
                        $resolve->replace($this->record, auth()->user(), $data['note'] ?? null);
                    } catch (RuntimeException $e) {
                        Notification::make()->danger()->title('Couldn’t replace')->body($e->getMessage())->send();
                        $action->halt();
                    }
                    $this->record->refresh();
                    Notification::make()->success()->title('Replacement code sent')->send();
                }),
            Action::make('refund')
                ->label('Mark as refunded')
                ->icon(Heroicon::OutlinedBanknotes)
                ->color('warning')
                ->visible($open)
                ->modalHeading('Record a refund')
                ->modalDescription('Transfer the money from your banking app first, then record it here. The customer is told the amount and your transfer reference.')
                ->fillForm(fn () => [
                    'amount' => $this->record->code->orderItem->unit_price_minor / 100,
                    'method' => $this->record->refund_method,
                    'account_number' => $this->record->refund_account_number,
                    'account_name' => $this->record->refund_account_name,
                ])
                ->schema([
                    TextInput::make('amount')->label('Amount refunded')->prefix(config('shop.currency'))->numeric()->minValue(1)->required(),
                    TextInput::make('reference')->label('Your transfer reference')->required()->maxLength(64),
                    Select::make('method')
                        ->label('Sent with')
                        ->options(PaymentMethods::enabled()->mapWithKeys(fn ($m) => [$m['key'] => $m['name']]))
                        ->required(),
                    TextInput::make('account_number')->label('To account')->required()->maxLength(40),
                    TextInput::make('account_name')->label('Account holder')->required()->maxLength(100),
                    $note(),
                ])
                ->action(function (array $data, ResolveReport $resolve) {
                    // The customer may have asked for a replacement; keep the account actually paid.
                    $this->record->update([
                        'refund_method' => $data['method'],
                        'refund_account_number' => preg_replace('/\s+/', '', $data['account_number']),
                        'refund_account_name' => trim($data['account_name']),
                    ]);
                    $resolve->refund($this->record, auth()->user(), (int) round($data['amount'] * 100), $data['reference'], $data['note'] ?? null);
                    $this->record->refresh();
                    Notification::make()->success()->title('Refund recorded')->send();
                }),
            Action::make('decline')
                ->label('Decline')
                ->icon(Heroicon::OutlinedXCircle)
                ->color('gray')
                ->visible($open)
                ->modalHeading('Decline this report?')
                ->modalDescription('The customer keeps the code and sees your reason in their language.')
                ->schema([
                    Select::make('reason')
                        ->options([
                            'already_redeemed' => 'Merchant says it was already redeemed',
                            'works' => 'We tested it and it works',
                            'region_stated' => 'Region was stated before purchase',
                            'other' => 'Other (explain in the note)',
                        ])
                        ->required(),
                    $note()->required(fn ($get) => $get('reason') === 'other'),
                ])
                ->action(function (array $data, ResolveReport $resolve) {
                    $resolve->decline($this->record, auth()->user(), $data['reason'], $data['note'] ?? null);
                    $this->record->refresh();
                    Notification::make()->title('Report declined')->send();
                }),
        ];
    }
}
