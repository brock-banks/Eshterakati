<?php

namespace App\Filament\Resources\ProblemReports\Schemas;

use App\Filament\Resources\ProblemReports\Tables\ProblemReportsTable;
use App\Models\ProblemReport;
use App\Support\Money;
use App\Support\PaymentMethods;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ProblemReportInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Grid::make(['default' => 1, 'lg' => 2])->columnSpanFull()->schema([
                    Section::make('Report')
                        ->schema([
                            TextEntry::make('status')->badge(),
                            TextEntry::make('reason')->formatStateUsing(fn (string $state) => ProblemReportsTable::REASONS[$state] ?? $state),
                            TextEntry::make('details')->label('What they said')->placeholder('—'),
                            TextEntry::make('created_at')->label('Reported')->dateTime('M j, g:i A'),
                            ImageEntry::make('screenshot')
                                ->label('Screenshot')
                                ->visible(fn (ProblemReport $record) => (bool) $record->screenshot_path)
                                ->state(fn (ProblemReport $record) => route('admin.reports.screenshot', $record))
                                ->url(fn (ProblemReport $record) => route('admin.reports.screenshot', $record), shouldOpenInNewTab: true)
                                ->imageHeight(360),
                        ]),
                    Section::make('Code')
                        ->description('Test the code with the merchant before deciding.')
                        ->schema([
                            TextEntry::make('item')
                                ->label('Item')
                                ->state(fn (ProblemReport $record) => "{$record->code->option->deal->merchant} {$record->code->option->deal->title} · {$record->code->option->label}"),
                            TextEntry::make('code.code')
                                ->label('Reported code')
                                ->state(fn (ProblemReport $record) => $record->code->code)
                                ->fontFamily('mono')
                                ->copyable(),
                            TextEntry::make('code.sold_at')->label('Sold')->dateTime('M j, Y'),
                            TextEntry::make('order.reference')
                                ->label('Order')
                                ->url(fn (ProblemReport $record) => url("/admin/orders/{$record->order->public_id}")),
                            TextEntry::make('order.phone')
                                ->label('Customer phone')
                                ->url(fn (ProblemReport $record) => 'https://wa.me/'.ltrim($record->order->phone, '+'), shouldOpenInNewTab: true)
                                ->helperText('Opens WhatsApp'),
                            TextEntry::make('locale')->label('Customer language')->formatStateUsing(fn (string $state) => $state === 'ar' ? 'Arabic' : 'English'),
                        ]),
                ]),
                Section::make('What the customer wants')
                    ->columns(2)
                    ->columnSpanFull()
                    ->schema([
                        TextEntry::make('preference')->badge()->color('gray'),
                        TextEntry::make('unit_price')
                            ->label('Paid for this code')
                            ->state(fn (ProblemReport $record) => Money::format($record->code->orderItem->unit_price_minor, $record->order->currency)),
                        TextEntry::make('refund_method')
                            ->label('Refund to')
                            ->formatStateUsing(fn (?string $state) => $state ? (PaymentMethods::find($state)['name'] ?? $state) : null)
                            ->placeholder('—'),
                        TextEntry::make('refund_account')
                            ->label('Account')
                            ->state(fn (ProblemReport $record) => $record->refund_account_number
                                ? "{$record->refund_account_number} · {$record->refund_account_name}"
                                : null)
                            ->copyable()
                            ->placeholder('—'),
                    ]),
                Section::make('Resolution')
                    ->columns(2)
                    ->columnSpanFull()
                    ->visible(fn (ProblemReport $record) => $record->resolved_at !== null)
                    ->schema([
                        TextEntry::make('replacement.id')
                            ->label('Replacement code')
                            ->state(fn (ProblemReport $record) => $record->replacement?->code)
                            ->fontFamily('mono')
                            ->placeholder('—'),
                        TextEntry::make('refund_amount_minor')
                            ->label('Refunded')
                            ->formatStateUsing(fn (?int $state, ProblemReport $record) => $state ? Money::format($state, $record->order->currency) : null)
                            ->placeholder('—'),
                        TextEntry::make('refund_reference')->label('Transfer reference')->placeholder('—'),
                        TextEntry::make('decline_code')->label('Declined because')->placeholder('—'),
                        TextEntry::make('resolution_note')->label('Note to customer')->placeholder('—'),
                        TextEntry::make('resolver.name')->label('Resolved by'),
                        TextEntry::make('resolved_at')->label('Resolved')->dateTime('M j, g:i A'),
                    ]),
            ]);
    }
}
