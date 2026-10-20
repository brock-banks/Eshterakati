<?php

namespace App\Filament\Resources\Deals\Pages;

use App\Enums\CouponCodeStatus;
use App\Filament\Resources\Deals\DealResource;
use App\Models\CouponCode;
use App\Models\Deal;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Icons\Heroicon;

/**
 * @property Deal $record
 */
class EditDeal extends EditRecord
{
    protected static string $resource = DealResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('addCodes')
                ->label('Add codes')
                ->icon(Heroicon::OutlinedPlusCircle)
                ->modalHeading('Add codes to stock')
                ->modalDescription('Paste one code per line. Codes are encrypted when saved and sold oldest first.')
                ->schema([
                    Select::make('option_id')
                        ->label('Option')
                        ->options(fn () => $this->record->options()->withCount('availableCodes')->get()
                            ->mapWithKeys(fn ($o) => [$o->id => "{$o->label} · {$o->available_codes_count} in stock"]))
                        ->required(),
                    Textarea::make('codes')
                        ->rows(10)
                        ->required()
                        ->placeholder("PIXE-7Q4K-X9PA-M2RT\nPIXE-H3VD-8KWN-Q5ZC"),
                ])
                ->action(function (array $data) {
                    $codes = collect(preg_split('/\R/', $data['codes']))
                        ->map(fn ($c) => trim($c))
                        ->filter()
                        ->unique();

                    $option = $this->record->options()->findOrFail($data['option_id']);
                    foreach ($codes as $code) {
                        CouponCode::create([
                            'deal_option_id' => $option->id,
                            'code' => $code,
                            'status' => CouponCodeStatus::Available,
                        ]);
                    }

                    Notification::make()->success()->title("Added {$codes->count()} codes to {$option->label}")->send();
                }),
            DeleteAction::make(),
        ];
    }
}
