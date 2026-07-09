<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// قناة المستخدم الخاصّة (بمفتاح uuid) — تسليم الرسائل اللحظيّة عبر Reverb
Broadcast::channel('user.{uuid}', function ($user, string $uuid) {
    return $user->uuid === $uuid;
});
