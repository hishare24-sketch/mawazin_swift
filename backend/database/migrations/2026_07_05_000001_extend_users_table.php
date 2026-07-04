<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// يمدّد جدول users القياسي بحقول المنصة: uuid ثابت + الدور + الهاتف.
// (جدول users الأساس وجدول Sanctum يأتيان من هجرات Laravel/الحزمة.)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique()->after('id');
            $table->string('role', 32)->default('seeker')->after('email');
            $table->string('phone', 32)->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['uuid', 'role', 'phone']);
        });
    }
};
