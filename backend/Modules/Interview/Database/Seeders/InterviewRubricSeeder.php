<?php

namespace Modules\Interview\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Interview\Entities\InterviewRubric;

class InterviewRubricSeeder extends Seeder
{
    public function run(): void
    {
        $rubrics = [
            [
                'key' => 'technical-standard', 'name' => 'التقييم التقنيّ المعياريّ', 'track' => 'technical', 'sort' => 1,
                'criteria' => [
                    ['key' => 'problem_solving', 'label' => 'حلّ المشكلات', 'weight' => 35],
                    ['key' => 'coding', 'label' => 'جودة الكود', 'weight' => 30],
                    ['key' => 'system_design', 'label' => 'تصميم الأنظمة', 'weight' => 20],
                    ['key' => 'communication', 'label' => 'التواصل التقنيّ', 'weight' => 15],
                ],
            ],
            [
                'key' => 'behavioral-standard', 'name' => 'التقييم السلوكيّ', 'track' => 'behavioral', 'sort' => 1,
                'criteria' => [
                    ['key' => 'communication', 'label' => 'التواصل', 'weight' => 30],
                    ['key' => 'teamwork', 'label' => 'العمل الجماعيّ', 'weight' => 25],
                    ['key' => 'culture_fit', 'label' => 'الملاءمة الثقافيّة', 'weight' => 25],
                    ['key' => 'leadership', 'label' => 'القيادة', 'weight' => 20],
                ],
            ],
            [
                'key' => 'screening-standard', 'name' => 'الفرز الأوّليّ', 'track' => 'screening', 'sort' => 1,
                'criteria' => [
                    ['key' => 'relevance', 'label' => 'مطابقة الخبرة', 'weight' => 40],
                    ['key' => 'motivation', 'label' => 'الدافعيّة', 'weight' => 30],
                    ['key' => 'communication', 'label' => 'التواصل', 'weight' => 30],
                ],
            ],
        ];

        foreach ($rubrics as $r) {
            InterviewRubric::updateOrCreate(
                ['key' => $r['key']],
                array_merge($r, ['active' => true, 'is_system' => true])
            );
        }
    }
}
