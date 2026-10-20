<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(CatalogSeeder::class);

        // Local admin for /admin. Change the password (or create your own with `php artisan make:filament-user`).
        if (app()->isLocal()) {
            User::updateOrCreate(['email' => 'admin@example.com'], [
                'name' => 'Store admin',
                'password' => 'password',
                'is_admin' => true,
            ]);
        }
    }
}
