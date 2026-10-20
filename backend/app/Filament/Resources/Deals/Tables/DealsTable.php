<?php

namespace App\Filament\Resources\Deals\Tables;

use App\Models\Deal;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class DealsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('merchant')
            ->columns([
                TextColumn::make('merchant')->searchable()->sortable()->weight('bold'),
                TextColumn::make('title')->searchable(),
                TextColumn::make('category.name'),
                TextColumn::make('available_codes_count')
                    ->label('Codes in stock')
                    ->counts('availableCodes')
                    ->badge()
                    ->color(fn (int $state) => match (true) {
                        $state === 0 => 'danger',
                        $state < 5 => 'warning',
                        default => 'success',
                    })
                    ->sortable(),
                IconColumn::make('is_active')->label('Listed')->boolean(),
                TextColumn::make('ends_at')->label('Ends')->dateTime('M j, g:i A')->placeholder('—'),
                TextColumn::make('sold_count')->label('Sold')->numeric()->sortable(),
            ])
            ->filters([
                SelectFilter::make('category')->relationship('category', 'name'),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->recordUrl(fn (Deal $record) => route('filament.admin.resources.deals.edit', $record));
    }
}
