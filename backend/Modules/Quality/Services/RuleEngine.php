<?php

namespace Modules\Quality\Services;

/**
 * محرّك القواعد — يحوّل إشارة خطأ خامّة إلى {بصمة، خطورة، نوع، طبقة، نطاق}.
 * القواعد الثابتة (راجع DOC/QUALITY_SYSTEM_PLAN.md §1.أ). البصمة تجمّع نفس
 * الخطأ مهما تكرّر (نوع + رسالة مطبّعة + إطار أعلى + مسار).
 */
class RuleEngine
{
    public const TYPES = ['render', 'api_5xx', 'api_4xx', 'console', 'unhandled', 'slow'];

    /**
     * @param  array<string,mixed>  $signal  {type,message,route?,status?,layer?,scope?,stack?,url?,meta?}
     * @return array{fingerprint:string,type:string,severity:string,layer:string,scope:?string,route:?string,message:string}
     */
    public function evaluate(array $signal): array
    {
        $type = in_array($signal['type'] ?? '', self::TYPES, true) ? $signal['type'] : 'console';
        $message = trim((string) ($signal['message'] ?? ''));
        $route = $this->clip($signal['route'] ?? null, 191);
        $layer = ($signal['layer'] ?? 'frontend') === 'backend' ? 'backend' : 'frontend';
        $status = isset($signal['status']) ? (int) $signal['status'] : null;
        $scope = $signal['scope'] ?? $this->deriveScope($route);
        $topFrame = $this->topFrame((string) ($signal['stack'] ?? ''));

        return [
            'fingerprint' => $this->fingerprint($type, $message, $topFrame, $route),
            'type' => $type,
            'severity' => $this->severity($type, $status, $signal),
            'layer' => $layer,
            'scope' => $scope,
            'route' => $route,
            'message' => $this->clip($message, 1000) ?? '',
        ];
    }

    /** بصمة مستقرّة: نوع + رسالة مطبّعة (بلا أرقام/معرّفات) + إطار أعلى + مسار. */
    public function fingerprint(string $type, string $message, string $topFrame, ?string $route): string
    {
        return sha1($type.'|'.$this->normalize($message).'|'.$topFrame.'|'.($route ?? ''));
    }

    /** الخطورة بالقواعد الثابتة. */
    public function severity(string $type, ?int $status, array $signal): string
    {
        // صفحة تُفرَّغ (blank) → حرِج فورًا
        if ($type === 'render' && ($signal['meta']['blank'] ?? false)) {
            return 'critical';
        }

        return match ($type) {
            'render', 'api_5xx', 'unhandled' => 'high',
            'api_4xx' => match ($status) {
                401, 419, 404 => 'info',   // متوقّع/جلسة
                403 => 'warning',
                default => 'warning',
            },
            'console', 'slow' => 'warning',
            default => 'info',
        };
    }

    /** تطبيع الرسالة: توحيد الأرقام/المعرّفات/الروابط كي تتجمّع البصمة. */
    private function normalize(string $message): string
    {
        $m = mb_strtolower($message);
        $m = preg_replace('/[0-9a-f]{8}-[0-9a-f-]{27}/i', '<uuid>', $m);      // uuid
        $m = preg_replace('#https?://[^\s"\']+#', '<url>', $m);              // urls
        $m = preg_replace('/\d+/', '<n>', $m);                              // أرقام (حتّى الملتصقة: 100ms، id42)
        $m = preg_replace('/\s+/', ' ', (string) $m);

        return trim((string) $m);
    }

    /** أوّل إطار ذي معنى من الستاك (لتثبيت البصمة). */
    private function topFrame(string $stack): string
    {
        foreach (preg_split('/\r\n|\r|\n/', $stack) as $line) {
            $line = trim($line);
            if ($line !== '' && (str_contains($line, 'at ') || str_contains($line, '@') || str_contains($line, '.'))) {
                return $this->clip($this->normalize($line), 191) ?? '';
            }
        }

        return '';
    }

    /** اشتقاق النطاق من المسار. */
    private function deriveScope(?string $route): ?string
    {
        if (! $route) {
            return null;
        }
        if (str_starts_with($route, '/admin')) {
            return 'admin';
        }
        if (preg_match('#^/(u|experts?|opportunities|assistant|people)\b#', $route)) {
            return 'public';
        }

        return 'app';
    }

    private function clip(mixed $value, int $len): ?string
    {
        if ($value === null || $value === '') {
            return $value === '' ? '' : null;
        }

        return mb_substr((string) $value, 0, $len);
    }
}
