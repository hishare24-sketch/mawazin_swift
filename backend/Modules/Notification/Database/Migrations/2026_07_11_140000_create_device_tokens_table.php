<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // توكنات أجهزة FCM لكلّ مستخدم — تُكمّل بثّ Reverb بإشعارات Push حين يُغلَق التطبيق.
        Schema::create('device_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 512);
            $table->string('platform', 20)->nullable(); // web | android | ios
            $table->timestamps();

            // لا فهرس على token (عمود طويل، حدود فهرسة متباينة بين المحرّكين) — التفرّد تطبيقيّ عبر updateOrCreate.
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
    }
};
