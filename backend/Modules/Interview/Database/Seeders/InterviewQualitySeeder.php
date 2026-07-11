<?php

namespace Modules\Interview\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Interview\Entities\Interview;
use Modules\Interview\Entities\InterviewRubric;
use Modules\User\Entities\User;

/**
 * بيانات مقابلات تجريبيّة لعرض طابور الجودة والمعايرة — تعتمد على InterviewRubricSeeder.
 */
class InterviewQualitySeeder extends Seeder
{
    public function run(): void
    {
        $uid = User::query()->value('id') ?? User::create([
            'name' => 'مرشّح', 'email' => 'cand'.uniqid().'@rec.test', 'password' => bcrypt('secret123'),
        ])->id;

        $byTrack = InterviewRubric::pluck('id', 'track');

        // [مسار، اسم، معايير، نزاهة، حالة مراجعة]
        $rows = [
            ['technical', 'سارة العتيبي', ['problem_solving' => 90, 'coding' => 85, 'system_design' => 80, 'communication' => 88], [], 'approved'],
            ['technical', 'خالد المطيري', ['problem_solving' => 60, 'coding' => 55, 'system_design' => 45, 'communication' => 70], ['tabSwitches' => 2, 'windowBlurs' => 1], 'pending'],
            ['technical', 'ريم الزهراني', ['problem_solving' => 40, 'coding' => 35, 'system_design' => 30, 'communication' => 50], ['pasteEvents' => 3, 'tabSwitches' => 5, 'multipleFaces' => true], 'flagged'],
            ['behavioral', 'عبدالله القحطاني', ['communication' => 82, 'teamwork' => 78, 'culture_fit' => 80, 'leadership' => 75], [], 'approved'],
            ['behavioral', 'نورة الشمري', ['communication' => 65, 'teamwork' => 70, 'culture_fit' => 60, 'leadership' => 55], ['windowBlurs' => 2], 'pending'],
            ['screening', 'فيصل الدوسري', ['relevance' => 88, 'motivation' => 80, 'communication' => 85], [], 'approved'],
            ['screening', 'لمى الغامدي', ['relevance' => 50, 'motivation' => 45, 'communication' => 60], ['copyEvents' => 4, 'faceMissingSecs' => 65], 'pending'],
            ['screening', 'ماجد الحربي', ['relevance' => 72, 'motivation' => 68, 'communication' => 70], [], 'pending'],
        ];

        foreach ($rows as [$track, $name, $scores, $integrity, $review]) {
            $weighted = $this->weighted($byTrack, $track, $scores);
            Interview::updateOrCreate(
                ['candidate_name' => $name, 'track' => $track],
                [
                    'user_id' => $uid,
                    'rubric_id' => $byTrack[$track] ?? null,
                    'status' => 'completed',
                    'score' => $weighted,
                    'criteria_scores' => $scores,
                    'review_status' => $review,
                    'integrity' => $integrity,
                ]
            );
        }
    }

    private function weighted($byTrack, string $track, array $scores): float
    {
        $rubric = InterviewRubric::find($byTrack[$track] ?? null);
        if (! $rubric) {
            return (float) round(array_sum($scores) / max(1, count($scores)), 2);
        }
        $total = $rubric->totalWeight();
        $sum = collect($rubric->criteria)->sum(fn ($c) => (float) ($scores[$c['key']] ?? 0) * (float) ($c['weight'] ?? 0));

        return round($sum / $total, 2);
    }
}
