<?php

namespace Modules\Account\Services;

use Illuminate\Support\Carbon;
use Modules\Account\Entities\Plan;
use Modules\Account\Entities\PlatformAccount;
use Modules\Account\Entities\Wallet;
use Modules\User\Entities\User;

class AccountService
{
    /** أسعار احتياطيّة — تُستعمل حين لا يوجد كتالوج باقات مبذور (يُبقي السلوك ثابتًا). */
    private const PLAN_PRICE = ['free' => 0, 'pro' => 50, 'elite' => 150];

    /** سعر باقة — من كتالوج plans إن وُجد، وإلّا من الثابت الاحتياطيّ. */
    private function planPrice(string $tier): float
    {
        $plan = Plan::where('key', $tier)->first();

        return $plan !== null ? (float) $plan->price : (float) (self::PLAN_PRICE[$tier] ?? 0);
    }

    /** محفظة المستخدم — تُنشأ برصيد ترحيبيّ عند أول وصول. */
    public function getWallet(int $userId): Wallet
    {
        $welcome = (float) setting('finance.welcome_balance', 100);

        return Wallet::firstOrCreate(
            ['user_id' => $userId],
            [
                'balance' => $welcome,
                'transactions' => [[
                    'id' => 1,
                    'amount' => $welcome,
                    'label' => __('Welcome balance'),
                    'at' => Carbon::now()->toISOString(),
                ]],
            ],
        );
    }

    public function getPlan(int $userId): array
    {
        return ['tier' => User::find($userId)?->tier ?? 'free'];
    }

    /** ترقية/تخفيض الباقة — الترقية تخصم الفرق من المحفظة (402 عند نقص الرصيد). */
    public function setPlan(int $userId, string $tier): array
    {
        $user = User::findOrFail($userId);
        $current = $user->tier ?? 'free';
        $cost = max(0, $this->planPrice($tier) - $this->planPrice($current));

        if ($cost > 0) {
            $wallet = $this->getWallet($userId);
            if ($wallet->balance < $cost) {
                abort(402, __('Insufficient funds to upgrade plan'));
            }

            $transactions = $wallet->transactions ?? [];
            $transactions[] = [
                'id' => $this->nextId($transactions),
                'amount' => -$cost,
                'label' => __('Plan upgrade to :tier', ['tier' => $tier]),
                'at' => Carbon::now()->toISOString(),
            ];
            $wallet->balance = $wallet->balance - $cost;
            $wallet->transactions = $transactions;
            $wallet->save();

            // طرف مقابل: يُرصَّد إيراد الترقية في خزينة المنصّة إن وُجد حساب افتراضيّ
            // (إضافيّ آمن — لا يغيّر ما يدفعه المستخدم؛ يُتجاهَل بلا خزينة مبذورة).
            PlatformAccount::default()?->post(
                $cost,
                'revenue',
                __('Plan upgrade to :tier', ['tier' => $tier]),
                'user:'.$userId,
            );

            // فاتورة اشتراك (سجلّ ماليّ قابل للاسترداد)
            \Modules\Billing\Entities\Invoice::create([
                'user_id' => $userId,
                'user_name' => $user->name,
                'plan_key' => $tier,
                'plan_name' => optional(Plan::where('key', $tier)->first())->name ?? $tier,
                'amount' => $cost,
                'status' => 'paid',
                'reference' => 'INV-'.$userId.'-'.$tier,
            ]);
        }

        $user->tier = $tier;
        $user->save();

        return ['tier' => $tier, 'balance' => (float) $this->getWallet($userId)->balance];
    }

    private function nextId(array $items): int
    {
        return (int) (collect($items)->max('id') ?? 0) + 1;
    }
}
