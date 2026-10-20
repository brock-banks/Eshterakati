<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Release codes held by orders nobody paid for. Run `php artisan schedule:work` (or cron) in production.
Schedule::command('orders:expire')->everyMinute()->withoutOverlapping();
