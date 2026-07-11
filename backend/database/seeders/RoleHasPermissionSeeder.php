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
            'view_users', 'create_users', 'update_users', 'view_roles',
            'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities',
            'view_requests', 'update_requests', 'delete_requests',
            'view_pipeline', 'manage_pipeline',
            'view_matching', 'manage_matching',
            'view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews', 'manage_interview_quality',
            'view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys',
            'view_survey_templates', 'manage_survey_templates',
            'view_profiles', 'view_broadcast', 'create_broadcast',
            'view_governance', 'manage_governance',
            'view_plans', 'create_plans', 'update_plans', 'delete_plans', 'view_wallets', 'adjust_wallets',
            'view_billing', 'manage_billing',
            'view_platform_accounts', 'manage_platform_accounts',
            'view_support', 'manage_support',
            'view_analytics', 'view_audit', 'view_settings', 'manage_settings',
            'view_ai', 'manage_ai',
            'view_chat', 'manage_chat',
            'view_reports', 'view_health',
            'view_branding', 'manage_branding',
            'view_archive', 'manage_archive',
        ]);

        // governance: الحوكمة والمحتوى فقط
        $governance = Role::where(['name' => 'governance', 'guard_name' => 'admin'])->first();
        $governance?->syncPermissions([
            'view_profiles', 'verify_skills',
            'view_endorsements', 'approve_endorsements',
            'view_governance', 'manage_governance', 'approve_experts',
            'view_analytics',
        ]);
    }
}
