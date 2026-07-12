<?php

namespace Modules\Quality\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * تحويل ذرّة إلى قسم (التشغيل/التستر/الباك/الفرونت/الفلاتر) بدورة حياة kanban.
 */
class QualityDispatch extends Model
{
    protected $table = 'quality_dispatches';

    protected $fillable = ['test_case_id', 'department', 'state', 'assignee', 'note'];

    public function testCase(): BelongsTo
    {
        return $this->belongsTo(TestCase::class, 'test_case_id');
    }
}
