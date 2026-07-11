<?php

namespace Modules\Interview\Entities;

use Illuminate\Database\Eloquent\Model;

class Interview extends Model
{
    protected $fillable = [
        'user_id', 'track', 'rubric_id', 'interviewer_id', 'candidate_name',
        'status', 'score', 'criteria_scores', 'review_status', 'reviewed_by', 'reviewed_at', 'integrity',
    ];

    protected $casts = [
        'score' => 'float',
        'integrity' => 'array',
        'criteria_scores' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function rubric()
    {
        return $this->belongsTo(InterviewRubric::class, 'rubric_id');
    }
}
