<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('platform_account_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);                   // موجب = وارد، سالب = صادر
            $table->string('type')->default('adjustment')->index(); // revenue | payout | transfer | adjustment | fee
            $table->string('reference')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_transactions');
    }
};
