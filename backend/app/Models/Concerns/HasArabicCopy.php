<?php

namespace App\Models\Concerns;

trait HasArabicCopy
{
    /**
     * The attribute in the current locale: `{attribute}_ar` when the app speaks
     * Arabic and it is filled in, otherwise the English column.
     */
    public function localized(string $attribute): ?string
    {
        if (app()->getLocale() === 'ar' && filled($this->{"{$attribute}_ar"})) {
            return $this->{"{$attribute}_ar"};
        }

        return $this->{$attribute};
    }
}
