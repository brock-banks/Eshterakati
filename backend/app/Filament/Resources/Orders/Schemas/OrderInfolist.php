<?php

namespace App\Filament\Resources\Orders\Schemas;

use App\Models\Order;
use App\Support\Money;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class OrderInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Grid::make(['default' => 1, 'lg' => 2])->columnSpanFull()->schema([
                    Section::make('Receipt')
                        ->description('Approve only after the money shows in the account — screenshots can be edited.')
                        ->visible(fn (Order $record) => $record->latestReceipt !== null)
                        ->schema([
                            ImageEntry::make('receipt_image')
                                ->hiddenLabel()
                                ->state(fn (Order $record) => route('admin.receipts.show', $record->latestReceipt))
                                ->url(fn (Order $record) => route('admin.receipts.show', $record->latestReceipt), shouldOpenInNewTab: true)
                                ->imageHeight(520),
                            TextEntry::make('latestReceipt.transaction_reference')
                                ->label('Transaction number')
                                ->copyable()
                                ->weight('bold'),
                            TextEntry::make('latestReceipt.created_at')
                                ->label('Uploaded')
                                ->since(),
                            TextEntry::make('receipts_count')
                                ->label('Receipts uploaded for this order')
                                ->state(fn (Order $record) => $record->receipts()->count()),
                        ]),
                    Section::make('Payment')
                        ->schema([
                            TextEntry::make('status')->badge(),
                            TextEntry::make('total_minor')
                                ->label('Amount to look for')
                                ->formatStateUsing(fn (int $state, Order $record) => Money::format($state, $record->currency))
                                ->size('lg')
                                ->weight('bold'),
                            TextEntry::make('reference')
                                ->label('Reference in the transfer note')
                                ->copyable(),
                            TextEntry::make('payment_method')
                                ->label('Account')
                                ->formatStateUsing(function (string $state, Order $record) {
                                    $pay = $record->paymentDetails();

                                    return $pay ? "{$pay['name']} · {$pay['account_number']}" : $state;
                                }),
                            TextEntry::make('expires_at')->label('Pay by')->dateTime('M j, g:i A'),
                            TextEntry::make('rejection_reason')->label('Last rejection')->placeholder('—'),
                            TextEntry::make('paid_at')->label('Approved')->dateTime('M j, g:i A')->placeholder('—'),
                            TextEntry::make('reviewer.name')->label('Reviewed by')->placeholder('—'),
                        ]),
                ]),
                Section::make('Customer')
                    ->columns(2)
                    ->columnSpanFull()
                    ->schema([
                        TextEntry::make('phone')
                            ->copyable()
                            ->url(fn (Order $record) => 'https://wa.me/'.ltrim($record->phone, '+'), shouldOpenInNewTab: true)
                            ->helperText('Opens WhatsApp'),
                        TextEntry::make('email')->placeholder('Not given'),
                    ]),
                Section::make('Items')
                    ->columnSpanFull()
                    ->schema([
                        RepeatableEntry::make('items')
                            ->hiddenLabel()
                            ->columns(4)
                            ->schema([
                                TextEntry::make('option.deal.merchant')->label('Merchant'),
                                TextEntry::make('option.label')->label('Option'),
                                TextEntry::make('quantity'),
                                TextEntry::make('unit_price_minor')
                                    ->label('Unit price')
                                    ->formatStateUsing(fn (int $state) => Money::format($state)),
                            ]),
                    ]),
            ]);
    }
}
