<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // معايير تقييم المقابلات (rubrics) — موجّهة بالبيانات، معايير موزونة لكلّ مسار.
        Schema::create('interview_rubrics', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('track')->index();
            $table->json('criteria');          // [{key,label,weight}] الأوزان تُطبّع للـ1
            $table->boolean('active')->default(true);
            $table->boolean('is_system')->default(false);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_rubrics');
    }
};
