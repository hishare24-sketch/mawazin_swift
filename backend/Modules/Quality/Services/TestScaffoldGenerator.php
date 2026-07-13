<?php

namespace Modules\Quality\Services;

use Modules\Quality\Entities\TestCase as TestCaseAtom;

/**
 * يولّد هيكل اختبار جاهزًا من ذرّة فجوة (⬜) — نقطة انطلاق للمطوّر (ف5).
 * الإطار يُختار بالنوع/الطبقة:
 *   - باك F  → PHPUnit feature (RefreshDatabase + Sanctum + AssertsApiJson)
 *   - باك U  → PHPUnit unit (نقيّ، بلا قاعدة بيانات)
 *   - واجهة U → vitest
 *   - E (أيّ) → Playwright (سقالة + تنويه أنّه لم يُهيّأ بعد — م5)
 */
class TestScaffoldGenerator
{
    /** @return array{caseId:string,framework:string,language:string,filename:string,code:string} */
    public function generate(TestCaseAtom $atom): array
    {
        $type = $atom->type ?: 'F';
        $isBackend = $atom->layer === 'backend';

        [$framework, $language] = match (true) {
            $type === 'E' => ['playwright', 'ts'],
            ! $isBackend && $type === 'U' => ['vitest', 'ts'],
            $isBackend && $type === 'U' => ['phpunit', 'php'],
            default => ['phpunit', 'php'], // باك F
        };

        $class = $this->className($atom);
        $method = $this->methodName($atom);

        $code = match ($framework) {
            'playwright' => $this->playwright($atom, $method),
            'vitest' => $this->vitest($atom, $class, $method),
            default => $type === 'U'
                ? $this->phpunitUnit($atom, $class, $method)
                : $this->phpunitFeature($atom, $class, $method),
        };

        return [
            'caseId' => $atom->case_id,
            'framework' => $framework,
            'language' => $language,
            'filename' => $this->filename($atom, $class, $framework),
            'code' => $code,
        ];
    }

    private function className(TestCaseAtom $atom): string
    {
        if ($atom->test_file) {
            // «AuthTest / X» → AuthTest
            $first = trim(explode('/', $atom->test_file)[0]);
            $clean = preg_replace('/[^A-Za-z0-9]/', '', $first);
            if ($clean) {
                return str_ends_with($clean, 'Test') ? $clean : $clean.'Test';
            }
        }

        return preg_replace('/[^A-Za-z0-9]/', '', ucfirst($atom->module ?: 'Case')).'Test';
    }

    private function methodName(TestCaseAtom $atom): string
    {
        return 'test_'.strtolower(preg_replace('/[^A-Za-z0-9]+/', '_', $atom->case_id));
    }

    private function filename(TestCaseAtom $atom, string $class, string $framework): string
    {
        return match ($framework) {
            'vitest' => "src/**/{$class}.test.ts",
            'playwright' => 'e2e/'.strtolower($atom->case_id).'.spec.ts',
            default => $atom->type === 'U'
                ? "backend/tests/Unit/{$class}.php"
                : "backend/tests/Feature/Api/Admin/{$class}.php",
        };
    }

    private function phpunitFeature(TestCaseAtom $atom, string $class, string $method): string
    {
        return <<<PHP
        <?php

        namespace Tests\Feature\Api\Admin;

        use Illuminate\Foundation\Testing\RefreshDatabase;
        use Laravel\Sanctum\Sanctum;
        use Modules\User\Entities\User;
        use Spatie\Permission\Models\Role;
        use Tests\Support\Api\AssertsApiJson;
        use Tests\TestCase;

        class {$class} extends TestCase
        {
            use AssertsApiJson, RefreshDatabase;

            protected function setUp(): void
            {
                parent::setUp();
                \$this->artisan('permission:insert');
            }

            /** {$atom->case_id}: {$atom->title} */
            public function {$method}(): void
            {
                // Arrange — أنشئ مستخدمًا/بيانات
                \$user = User::create(['name' => 'T', 'email' => 't'.uniqid().'@rec.test', 'password' => 'secret123']);
                \$user->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
                Sanctum::actingAs(\$user);

                // Act — نفّذ الطلب
                // \$res = \$this->getJson('/api/admin/...');

                // Assert — تحقّق
                // \$res->assertOk()->assertJsonStructure([...]);
                \$this->markTestIncomplete('مشتقّ من {$atom->case_id} — يُكمَل');
            }
        }
        PHP;
    }

    private function phpunitUnit(TestCaseAtom $atom, string $class, string $method): string
    {
        return <<<PHP
        <?php

        namespace Tests\Unit;

        use PHPUnit\Framework\TestCase;

        class {$class} extends TestCase
        {
            /** {$atom->case_id}: {$atom->title} */
            public function {$method}(): void
            {
                // Arrange / Act / Assert
                \$this->markTestIncomplete('مشتقّ من {$atom->case_id} — يُكمَل');
            }
        }
        PHP;
    }

    private function vitest(TestCaseAtom $atom, string $class, string $method): string
    {
        $desc = addslashes($atom->title);

        return <<<TS
        import { describe, expect, it } from 'vitest'

        // {$atom->case_id}: {$atom->title}
        describe('{$class}', () => {
          it('{$desc}', () => {
            // Arrange / Act / Assert
            expect.fail('مشتقّ من {$atom->case_id} — يُكمَل')
          })
        })
        TS;
    }

    private function playwright(TestCaseAtom $atom, string $method): string
    {
        $desc = addslashes($atom->title);

        return <<<TS
        import { expect, test } from '@playwright/test'

        // {$atom->case_id}: {$atom->title}
        // ملاحظة: Playwright لم يُهيّأ بعد (م5 من خطّة الجودة) — سقالة مبدئيّة.
        test('{$desc}', async ({ page }) => {
          // await page.goto('/...')
          // await expect(page.getByRole('...')).toBeVisible()
          test.fixme(true, 'مشتقّ من {$atom->case_id} — يُكمَل')
        })
        TS;
    }
}
