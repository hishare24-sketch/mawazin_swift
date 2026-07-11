<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // دفتر استهلاك التوكن — كلّ تبادل مساعد يُسجَّل صفًّا لإنفاذ حصص الباقات.
        Schema::create('ai_usage', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->index();
            $table->unsignedInteger('tokens')->default(0);          // الإجماليّ (طلب + ردّ)
            $table->unsignedInteger('request_tokens')->default(0);
            $table->unsignedInteger('response_tokens')->default(0);
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->timestamp('created_at')->nullable()->index();   // مفتاح النوافذ الزمنيّة
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage');
    }
};
