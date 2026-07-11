<?php

namespace Modules\User\Emails;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * بريد ترحيبيّ يُرسَل عبر Resend عند التسجيل — مُصفَّر (queue) فلا يعطّل الاستجابة.
 */
class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public string $name) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('Welcome to :app', ['app' => config('app.name')]),
        );
    }

    public function content(): Content
    {
        $app = e(config('app.name'));
        $name = e($this->name);

        return new Content(
            htmlString: <<<HTML
                <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#1f2937">
                    <h2 style="margin:0 0 8px">أهلًا {$name} 👋</h2>
                    <p>مرحبًا بك في <strong>{$app}</strong>. حسابك جاهز — أكمِل ملفّك الشخصيّ لترفع درجة الثقة وتظهر لأصحاب العمل.</p>
                    <p style="color:#6b7280;font-size:13px">إن لم تنشئ هذا الحساب فتجاهل هذه الرسالة.</p>
                </div>
                HTML,
        );
    }
}
