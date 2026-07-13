<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// قناة المستخدم الخاصّة (بمفتاح uuid) — تسليم الرسائل اللحظيّة عبر Reverb
Broadcast::channel('user.{uuid}', function ($user, string $uuid) {
    return $user->uuid === $uuid;
});

// قناة الأدمن للدعم — ردود المستخدمين اللحظيّة (تخويل بصلاحية view_support على guard admin)
Broadcast::channel('support.admin', function ($user) {
    try {
        return $user->hasPermissionTo('view_support', 'admin');
    } catch (Throwable) {
        return false;
    }
});

// قناة الأدمن للإشراف — بلاغات المحتوى الجديدة لحظيًّا (تخويل بصلاحية view_governance على guard admin)
Broadcast::channel('admin.governance', function ($user) {
    try {
        return $user->hasPermissionTo('view_governance', 'admin');
    } catch (Throwable) {
        return false;
    }
});
