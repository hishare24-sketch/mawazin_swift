<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_states', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('store');
            $table->json('data')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'store']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_states');
    }
};
