<?php

namespace Tests\Unit\Quality;

use Modules\Quality\Entities\TestCase as TestCaseAtom;
use Modules\Quality\Services\TestScaffoldGenerator;
use PHPUnit\Framework\TestCase;

class TestScaffoldGeneratorTest extends TestCase
{
    private function gen(array $attrs): array
    {
        return (new TestScaffoldGenerator)->generate(new TestCaseAtom(array_merge([
            'case_id' => 'AUTH-07', 'title' => 'register بلا اسم → 422', 'layer' => 'backend',
            'section' => 'User', 'module' => 'User', 'type' => 'F', 'test_file' => 'AuthTest',
        ], $attrs)));
    }

    public function test_backend_feature_produces_phpunit_class(): void
    {
        $s = $this->gen(['type' => 'F']);
        $this->assertSame('phpunit', $s['framework']);
        $this->assertSame('php', $s['language']);
        $this->assertStringContainsString('class AuthTest extends TestCase', $s['code']);
        $this->assertStringContainsString('RefreshDatabase', $s['code']);
        $this->assertStringContainsString('public function test_auth_07', $s['code']);
        $this->assertStringContainsString('AUTH-07', $s['code']);
    }

    public function test_backend_unit_is_pure_phpunit(): void
    {
        $s = $this->gen(['type' => 'U', 'test_file' => 'MatchServiceTest']);
        $this->assertStringContainsString('use PHPUnit\Framework\TestCase;', $s['code']);
        $this->assertStringNotContainsString('RefreshDatabase', $s['code']);
    }

    public function test_frontend_unit_produces_vitest(): void
    {
        $s = $this->gen(['layer' => 'frontend', 'type' => 'U', 'test_file' => null]);
        $this->assertSame('vitest', $s['framework']);
        $this->assertSame('ts', $s['language']);
        $this->assertStringContainsString("from 'vitest'", $s['code']);
    }

    public function test_e2e_produces_playwright_stub(): void
    {
        $s = $this->gen(['layer' => 'frontend', 'type' => 'E', 'test_file' => null]);
        $this->assertSame('playwright', $s['framework']);
        $this->assertStringContainsString('@playwright/test', $s['code']);
    }
}
