<?php

namespace Modules\AccountState\Services;

use Modules\AccountState\Entities\AccountState;

class AccountStateService
{
    /** كتلة المخزن (null إن لم تُحفظ). */
    public function get(int $userId, string $store): mixed
    {
        return AccountState::where('user_id', $userId)->where('store', $store)->first()?->data;
    }

    /** حفظ كتلة المخزن (upsert لكل مستخدم×مخزن). */
    public function put(int $userId, string $store, mixed $data): void
    {
        AccountState::updateOrCreate(
            ['user_id' => $userId, 'store' => $store],
            ['data' => $data],
        );
    }
}
