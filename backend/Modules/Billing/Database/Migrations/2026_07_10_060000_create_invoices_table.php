<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();          // لقطة اسم في وقت الفاتورة
            $table->string('plan_key');                       // free | pro | elite | ...
            $table->string('plan_name')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('status')->default('paid')->index(); // paid | refunded
            $table->string('reference')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
