<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // التحويل: توجيه الذرّة إلى قسمها (تشغيل/تستر/باك/فرونت/فلاتر/فرز) بدورة حياة.
        // تحويل واحد نشط لكلّ ذرّة (لوحة kanban) — الحركة = تحديث القسم/الحالة.
        Schema::create('quality_dispatches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('test_case_id')->unique()->constrained('test_cases')->cascadeOnDelete();
            $table->string('department')->index();   // triage|ops|testing|backend|frontend|filters
            $table->string('state', 12)->default('todo'); // todo|doing|review|done
            $table->string('assignee')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_dispatches');
    }
};
