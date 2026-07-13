<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Modules\Quality\Entities\QualitySnapshot as Snapshot;
use Modules\Quality\Entities\TestCase as TestCaseAtom;

/**
 * لقطة تغطية يوميّة من جدول test_cases (بلا قراءة Markdown — تعمل في الإنتاج دائمًا).
 * تُجدوَل يوميًّا لبناء اتّجاه التغطية في لوحة مركز القيادة (ف3/ف6 self-healing).
 */
class QualitySnapshot extends Command
{
    protected $signature = 'quality:snapshot';

    protected $description = 'Write a daily quality coverage snapshot from the atoms table';

    public function handle(): int
    {
        if (TestCaseAtom::count() === 0) {
            $this->warn('لا ذرّات — تخطّي اللقطة.');

            return self::SUCCESS;
        }

        $byLayer = TestCaseAtom::selectRaw("layer, COUNT(*) total, SUM(CASE WHEN status='automated' THEN 1 ELSE 0 END) automated")
            ->groupBy('layer')->get()
            ->mapWithKeys(fn ($r) => [$r->layer => ['total' => (int) $r->total, 'automated' => (int) $r->automated]])
            ->all();

        $today = Carbon::now()->toDateString();
        Snapshot::whereDate('captured_on', $today)->delete();
        Snapshot::create([
            'captured_on' => $today,
            'total' => TestCaseAtom::count(),
            'automated' => TestCaseAtom::where('status', 'automated')->count(),
            'gap' => TestCaseAtom::where('status', 'gap')->count(),
            'failing' => TestCaseAtom::where('status', 'failing')->count(),
            'by_layer' => $byLayer,
        ]);

        $this->info("لقطة {$today} كُتبت.");

        return self::SUCCESS;
    }
}
