<?php

namespace App\Filament\Resources\Categories;

use App\Filament\Resources\Categories\Pages\ManageCategories;
use App\Models\Category;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSquares2x2;

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('slug')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('name_ar')
                    ->label('Name (Arabic)')
                    ->extraInputAttributes(['dir' => 'rtl']),
                // Must be one of the icons the storefront ships (frontend/src/components/Icon.tsx).
                Select::make('icon')
                    ->options(['tv' => 'TV', 'gamepad' => 'Gamepad', 'utensils' => 'Utensils', 'tag' => 'Tag', 'plane' => 'Plane', 'layers' => 'Layers'])
                    ->required(),
                TextInput::make('hue')
                    ->required()
                    ->numeric(),
                TextInput::make('blurb')
                    ->required(),
                TextInput::make('blurb_ar')
                    ->label('Blurb (Arabic)')
                    ->extraInputAttributes(['dir' => 'rtl']),
                TextInput::make('sort_order')
                    ->required()
                    ->numeric()
                    ->default(0),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->columns([
                TextColumn::make('slug')
                    ->searchable(),
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('name_ar')
                    ->label('Arabic')
                    ->placeholder('—'),
                TextColumn::make('icon')
                    ->searchable(),
                TextColumn::make('hue')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('blurb')
                    ->searchable(),
                TextColumn::make('sort_order')
                    ->numeric()
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageCategories::route('/'),
        ];
    }
}
