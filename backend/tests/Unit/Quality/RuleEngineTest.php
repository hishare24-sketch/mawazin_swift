<?php

namespace Tests\Unit\Quality;

use Modules\Quality\Services\RuleEngine;
use PHPUnit\Framework\TestCase;

class RuleEngineTest extends TestCase
{
    private function engine(): RuleEngine
    {
        return new RuleEngine;
    }

    public function test_fingerprint_groups_messages_that_differ_only_by_numbers(): void
    {
        $e = $this->engine();
        $a = $e->evaluate(['type' => 'api_5xx', 'message' => 'Server 500 on request 12345', 'route' => '/x']);
        $b = $e->evaluate(['type' => 'api_5xx', 'message' => 'Server 500 on request 98765', 'route' => '/x']);

        $this->assertSame($a['fingerprint'], $b['fingerprint']); // الأرقام مطبّعة → نفس البصمة
    }

    public function test_fingerprint_differs_by_type_and_route(): void
    {
        $e = $this->engine();
        $base = $e->evaluate(['type' => 'console', 'message' => 'boom', 'route' => '/a']);
        $byType = $e->evaluate(['type' => 'unhandled', 'message' => 'boom', 'route' => '/a']);
        $byRoute = $e->evaluate(['type' => 'console', 'message' => 'boom', 'route' => '/b']);

        $this->assertNotSame($base['fingerprint'], $byType['fingerprint']);
        $this->assertNotSame($base['fingerprint'], $byRoute['fingerprint']);
    }

    public function test_severity_fixed_rules(): void
    {
        $e = $this->engine();
        $this->assertSame('high', $e->evaluate(['type' => 'api_5xx', 'message' => 'x'])['severity']);
        $this->assertSame('high', $e->evaluate(['type' => 'unhandled', 'message' => 'x'])['severity']);
        $this->assertSame('info', $e->evaluate(['type' => 'api_4xx', 'message' => 'x', 'status' => 401])['severity']);
        $this->assertSame('warning', $e->evaluate(['type' => 'api_4xx', 'message' => 'x', 'status' => 403])['severity']);
        $this->assertSame('warning', $e->evaluate(['type' => 'console', 'message' => 'x'])['severity']);
        $this->assertSame('critical', $e->evaluate(['type' => 'render', 'message' => 'x', 'meta' => ['blank' => true]])['severity']);
    }

    public function test_unknown_type_falls_back_and_scope_derived_from_route(): void
    {
        $e = $this->engine()->evaluate(['type' => 'weird', 'message' => 'x', 'route' => '/admin/quality']);
        $this->assertSame('console', $e['type']);   // نوع مجهول → console
        $this->assertSame('admin', $e['scope']);     // /admin* → admin
    }
}
