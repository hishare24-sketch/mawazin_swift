<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // هويّة المنصّة — صفّ مفرد يحكم العلامة الافتراضيّة (اسم/شعار/ألوان/ثيم/دخول).
        Schema::create('branding_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('platform_name')->default('منظومة التوظيف الذكية');
            $table->string('tagline')->nullable();
            $table->text('logo_url')->nullable();
            $table->string('default_preset')->default('littlebee'); // littlebee|ocean|royal|desert|emerald
            $table->string('primary_color')->nullable();            // hex override
            $table->string('secondary_color')->nullable();
            $table->string('default_mode')->default('dark');        // dark|light|mixed
            $table->string('login_headline')->nullable();
            $table->string('login_subtext')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branding_settings');
    }
};
