<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // رصد وقت-التشغيل: إشارات الأخطاء مجمّعة بالبصمة (نوع+رسالة مطبّعة+إطار+مسار).
        // تُغذّى من مُلتقِط أماميّ عبر POST /api/v1/observe وتمرّ بمحرّك القواعد.
        Schema::create('runtime_errors', function (Blueprint $table): void {
            $table->id();
            $table->string('fingerprint')->unique();
            $table->string('type')->index();          // render|api_5xx|api_4xx|console|unhandled|slow
            $table->text('message');
            $table->string('layer')->default('frontend')->index(); // frontend|backend
            $table->string('scope')->nullable()->index();          // admin|public|seeker…
            $table->string('route')->nullable();
            $table->string('severity', 12)->default('info')->index(); // critical|high|warning|info
            $table->string('status', 12)->default('new')->index();    // new|ongoing|resolved|regressed
            $table->unsignedInteger('count')->default(1);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('runtime_errors');
    }
};
