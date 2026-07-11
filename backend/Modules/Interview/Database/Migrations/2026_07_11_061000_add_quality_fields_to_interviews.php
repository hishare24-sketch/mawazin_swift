<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interviews', function (Blueprint $table): void {
            $table->unsignedBigInteger('rubric_id')->nullable()->index()->after('track');
            $table->unsignedBigInteger('interviewer_id')->nullable()->index()->after('rubric_id');
            $table->string('candidate_name')->nullable()->after('interviewer_id');
            $table->json('criteria_scores')->nullable()->after('score'); // {criterionKey: 0..100}
            $table->string('review_status')->default('pending')->index()->after('criteria_scores'); // pending|approved|flagged
            $table->unsignedBigInteger('reviewed_by')->nullable()->after('review_status');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('interviews', function (Blueprint $table): void {
            $table->dropColumn(['rubric_id', 'interviewer_id', 'candidate_name', 'criteria_scores', 'review_status', 'reviewed_by', 'reviewed_at']);
        });
    }
};
