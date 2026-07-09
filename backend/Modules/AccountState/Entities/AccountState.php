<?php

namespace Modules\AccountState\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * مستند خاصّ عامّ (blob) لكل (مستخدم × مخزن) — يقابل جدول Supabase account_states.
 * يخدم المخازن التي لا مورد مخصّص لها (قوائم المستخدم الخاصّة ككتلة JSON).
 */
class AccountState extends Model
{
    protected $fillable = ['user_id', 'store', 'data'];

    protected $casts = ['data' => 'array'];
}
