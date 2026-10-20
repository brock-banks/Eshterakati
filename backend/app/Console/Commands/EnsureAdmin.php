<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('shop:admin {--email= : Defaults to SHOP_ADMIN_EMAIL} {--password= : Defaults to SHOP_ADMIN_PASSWORD}')]
#[Description('Create the /admin account if it does not exist yet (an existing account keeps its password)')]
class EnsureAdmin extends Command
{
    public function handle(): int
    {
        $email = $this->option('email') ?: config('shop.admin_email');
        $password = $this->option('password') ?: config('shop.admin_password');

        if (! $email || ! $password) {
            $this->info('No admin email/password given; skipping.');

            return self::SUCCESS;
        }

        $user = User::firstOrNew(['email' => $email]);
        if (! $user->exists) {
            $user->name = 'Store admin';
            $user->password = $password;
        }
        $user->is_admin = true;
        $user->save();

        $this->info($user->wasRecentlyCreated ? "Created admin {$email}." : "{$email} is an admin.");

        return self::SUCCESS;
    }
}
