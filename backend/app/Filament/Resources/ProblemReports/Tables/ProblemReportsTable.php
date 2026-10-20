<?php

namespace App\Filament\Resources\ProblemReports\Tables;

use App\Enums\ReportStatus;
use App\Models\ProblemReport;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProblemReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            // Open reports first, oldest open at the top so nothing waits too long.
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->with('code.option.deal', 'order')
                ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [ReportStatus::Open->value])
                ->orderByRaw('CASE WHEN status = ? THEN created_at END ASC', [ReportStatus::Open->value])
                ->latest('id'))
            ->columns([
                TextColumn::make('order.reference')->label('Order')->searchable()->weight('bold'),
                TextColumn::make('status')->badge(),
                TextColumn::make('item')
                    ->label('Code')
                    ->state(fn (ProblemReport $record) => "{$record->code->option->deal->merchant} · {$record->code->option->label}"),
                TextColumn::make('reason')->formatStateUsing(fn (string $state) => self::REASONS[$state] ?? $state),
                TextColumn::make('preference')->label('Wants')->badge()->color('gray'),
                TextColumn::make('created_at')->label('Reported')->since(),
            ])
            ->filters([
                SelectFilter::make('status')->options(ReportStatus::class),
            ])
            ->recordActions([
                ViewAction::make(),
            ]);
    }

    public const REASONS = [
        'invalid' => 'Code is invalid',
        'already_used' => 'Already used',
        'wrong_region' => 'Doesn’t work in their region',
        'other' => 'Something else',
    ];
}
