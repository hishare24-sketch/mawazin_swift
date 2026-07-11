<?php

namespace Modules\Admin\Enums;

/**
 * المصدر الوحيد لصلاحيّات أدمن منصّة التوظيف (guard: admin).
 * النمط: {action}_{resource} — view_/create_/update_/delete_.
 * صلاحيّات أعضاء المشاريع (Spatie teams) منفصلة، تُضاف في المرحلة 4 بعد حسم ع2.
 */
class PermissionEnum
{
    public static function permissions(): array
    {
        return [
            // المستخدمون والأدوار
            'view_users', 'create_users', 'update_users', 'delete_users',
            'view_roles', 'create_roles', 'update_roles', 'delete_roles',

            // الفرص والطلبات (السوق)
            'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities',
            'view_requests', 'update_requests', 'delete_requests',
            'view_pipeline', 'manage_pipeline',
            'view_matching', 'manage_matching',

            // المقيّمون والمقابلات (حوكمة الاعتماد)
            'view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers',
            'view_interviews',

            // الاستبيانات
            'view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys',

            // الملفّات والتزكيات والخبراء (حوكمة)
            'view_profiles', 'verify_skills',
            'view_endorsements', 'approve_endorsements',
            'view_governance', 'manage_governance', 'approve_experts',

            // البثّ والإشعارات
            'view_broadcast', 'create_broadcast',

            // الباقات والمحفظة والفوترة
            'view_plans', 'create_plans', 'update_plans', 'delete_plans', 'view_wallets', 'adjust_wallets',
            'view_billing', 'manage_billing',

            // خزينة المنصّة (حسابات بنكيّة/دفتر إيرادات)
            'view_platform_accounts', 'manage_platform_accounts',

            // نماذج الاستبيانات
            'view_survey_templates', 'manage_survey_templates',

            // الدعم والتذاكر
            'view_support', 'manage_support',

            // التحليلات وسجلّ التدقيق والإعدادات
            'view_analytics', 'view_audit', 'view_settings', 'manage_settings',
            'view_branding', 'manage_branding',

            // الذكاء الاصطناعيّ (حوكمة المساعد)
            'view_ai', 'manage_ai',

            // المحادثات (إشراف وحوكمة)
            'view_chat', 'manage_chat',

            // الرؤى والتقارير
            'view_reports',

            // صحّة النظام والمراقبة
            'view_health',
        ];
    }
}
