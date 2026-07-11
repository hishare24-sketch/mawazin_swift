<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // محادثات المساعد الذكيّ لكلّ مستخدم (للسجلّ والتتبّع والإشراف).
        Schema::create('assistant_conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->index();
            $table->string('title')->default('محادثة جديدة');
            $table->timestamps();
        });

        Schema::create('assistant_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->index();
            $table->string('role'); // user | assistant
            $table->text('body');
            $table->json('meta')->nullable(); // level, tokensCap, usedKnowledge, nudges, provider
            $table->timestamps();
        });

        // تفضيلات المساعد لكلّ مستخدم — الخصوصيّة والاستباقيّة.
        Schema::create('assistant_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->boolean('data_access')->default(true);   // السماح للمساعد باستخدام بيانات المستخدم
            $table->boolean('proactive')->default(true);      // التنبيهات الاستباقيّة
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_messages');
        Schema::dropIfExists('assistant_conversations');
        Schema::dropIfExists('assistant_preferences');
    }
};
