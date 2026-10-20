<?php

namespace App\Filament\Resources\Orders\Tables;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Support\Money;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class OrdersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            // Receipts waiting for review come first, newest orders after.
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [OrderStatus::InReview->value])
                ->latest('id'))
            ->columns([
                TextColumn::make('reference')
                    ->searchable()
                    ->copyable()
                    ->weight('bold'),
                TextColumn::make('status')
                    ->badge(),
                TextColumn::make('total_minor')
                    ->label('Total')
                    ->formatStateUsing(fn (int $state, Order $record) => Money::format($state, $record->currency)),
                TextColumn::make('payment_method')
                    ->label('Paid with')
                    ->formatStateUsing(fn (string $state, Order $record) => $record->paymentDetails()['name'] ?? $state),
                TextColumn::make('phone')
                    ->searchable(),
                TextColumn::make('email')
                    ->searchable()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Placed')
                    ->since(),
                TextColumn::make('expires_at')
                    ->label('Pay by')
                    ->dateTime('M j, g:i A')
                    ->toggleable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(OrderStatus::class),
            ])
            ->recordActions([
                ViewAction::make(),
            ]);
    }
}
