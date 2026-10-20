<?php

namespace App\Filament\Resources\ProblemReports;

use App\Enums\ReportStatus;
use App\Filament\Resources\ProblemReports\Pages\ListProblemReports;
use App\Filament\Resources\ProblemReports\Pages\ViewProblemReport;
use App\Filament\Resources\ProblemReports\Schemas\ProblemReportInfolist;
use App\Filament\Resources\ProblemReports\Tables\ProblemReportsTable;
use App\Models\ProblemReport;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

/**
 * Customers' "this code doesn't work" reports. Created from the storefront only.
 */
class ProblemReportResource extends Resource
{
    protected static ?string $model = ProblemReport::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFlag;

    protected static ?int $navigationSort = 2;

    public static function getNavigationBadge(): ?string
    {
        $open = ProblemReport::where('status', ReportStatus::Open)->count();

        return $open ? (string) $open : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'danger';
    }

    public static function getNavigationBadgeTooltip(): ?string
    {
        return 'Open reports';
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function infolist(Schema $schema): Schema
    {
        return ProblemReportInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return ProblemReportsTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListProblemReports::route('/'),
            'view' => ViewProblemReport::route('/{record}'),
        ];
    }
}
