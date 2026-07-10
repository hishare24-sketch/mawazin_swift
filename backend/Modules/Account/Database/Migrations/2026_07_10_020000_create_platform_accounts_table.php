<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_accounts', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('type')->default('bank');           // bank | cash | gateway
            $table->string('bank_name')->nullable();
            $table->string('account_no_masked')->nullable();
            $table->string('currency', 8)->default('SAR');
            $table->decimal('balance', 14, 2)->default(0);
            $table->boolean('is_default')->default(false);      // حساب استقبال الإيرادات
            $table->boolean('active')->default(true);
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_accounts');
    }
};
