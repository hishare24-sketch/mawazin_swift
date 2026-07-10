<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Admin\Enums\PermissionEnum;
use Spatie\Permission\Models\Role;

class RoleHasPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // super_admin يملك كل الصلاحيّات
        $super = Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first();
        $super?->syncPermissions(PermissionEnum::permissions());

        // admin: صلاحيّات تشغيليّة واسعة عدا إدارة الأدوار الكتابيّة والحذف الصلب للمستخدمين
        $admin = Role::where(['name' => 'admin', 'guard_name' => 'admin'])->first();
        $admin?->syncPermissions([
            'view_users', 'update_users', 'view_roles',
            'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities',
            'view_requests', 'update_requests', 'delete_requests',
            'view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews',
            'view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys',
            'view_profiles', 'view_broadcast', 'create_broadcast',
            'view_plans', 'update_plans', 'view_wallets', 'adjust_wallets',
            'view_analytics',
        ]);

        // governance: الحوكمة والمحتوى فقط
        $governance = Role::where(['name' => 'governance', 'guard_name' => 'admin'])->first();
        $governance?->syncPermissions([
            'view_profiles', 'verify_skills',
            'view_endorsements', 'approve_endorsements',
            'view_governance', 'approve_experts',
            'view_analytics',
        ]);
    }
}
