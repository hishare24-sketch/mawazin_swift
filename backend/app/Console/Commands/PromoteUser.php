<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;

class PromoteUser extends Command
{
    protected $signature = 'user:promote {email} {role=super_admin}';

    protected $description = 'Grant a platform-admin role (guard: admin) to a user by email';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('User not found: '.$this->argument('email'));

            return self::FAILURE;
        }

        $role = Role::where(['name' => $this->argument('role'), 'guard_name' => 'admin'])->first();
        if (! $role) {
            $this->error('Role not found (run permission:insert first): '.$this->argument('role'));

            return self::FAILURE;
        }

        $user->assignRole($role);
        $this->info("Promoted {$user->email} → {$this->argument('role')}");

        return self::SUCCESS;
    }
}
