<?php

namespace App\Filament\Resources\Deals\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class DealForm
{
    public static function configure(Schema $schema): Schema
    {
        // Prices are edited in whole pounds and stored in minor units.
        $money = fn (TextInput $input) => $input
            ->numeric()
            ->minValue(0)
            ->prefix(config('shop.currency'))
            ->formatStateUsing(fn ($state) => $state === null ? null : $state / 100)
            ->dehydrateStateUsing(fn ($state) => $state === null || $state === '' ? null : (int) round($state * 100));

        return $schema
            ->components([
                Section::make('Deal')
                    ->columns(2)
                    ->columnSpanFull()
                    ->schema([
                        TextInput::make('merchant')
                            ->required()
                            ->live(onBlur: true)
                            ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', Str::slug($state)) : null),
                        TextInput::make('title')->required()->placeholder('Store credit'),
                        TextInput::make('slug')->required()->unique(ignoreRecord: true)->helperText('Used in the page address.'),
                        Select::make('category_id')->relationship('category', 'name')->required(),
                        TextInput::make('blurb')->required()->maxLength(255)->columnSpanFull(),
                        TextInput::make('region')->required()->default('Worldwide')->helperText('Where the code can be redeemed.'),
                        TextInput::make('hue')
                            ->required()
                            ->numeric()
                            ->minValue(0)
                            ->maxValue(360)
                            ->default(220)
                            ->helperText('Colour of the merchant tile, 0–360.'),
                        DateTimePicker::make('ends_at')->label('Offer ends')->helperText('Leave empty for no deadline.'),
                        Toggle::make('is_active')->label('Listed in the store')->default(true),
                        Toggle::make('is_featured')->label('Today’s pick on Discover'),
                    ]),
                Section::make('Options')
                    ->description('Each option is a value customers can buy, e.g. “$25”. Add codes for it from the deal page.')
                    ->columnSpanFull()
                    ->schema([
                        Repeater::make('options')
                            ->relationship()
                            ->hiddenLabel()
                            ->orderColumn('sort_order')
                            ->columns(3)
                            ->minItems(1)
                            ->schema([
                                TextInput::make('label')->required()->placeholder('$25'),
                                $money(TextInput::make('price_minor')->label('Price')->required()),
                                $money(TextInput::make('compare_at_minor')->label('Was (optional)'))
                                    ->helperText('Shows a sale badge when higher than the price.'),
                            ]),
                    ]),
                Section::make('Social proof')
                    ->columns(3)
                    ->columnSpanFull()
                    ->collapsed()
                    ->schema([
                        TextInput::make('rating')->numeric()->minValue(0)->maxValue(5)->default(0),
                        TextInput::make('reviews_count')->numeric()->default(0),
                        TextInput::make('sold_count')->numeric()->default(0),
                    ]),
            ]);
    }
}
