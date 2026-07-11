<?php

namespace Modules\Marketplace\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Entities\Opportunity;

class MarketplaceService
{
    public function listOpportunities(?string $q, ?string $category, int $perPage = 15): LengthAwarePaginator
    {
        $this->seedOpportunities();

        return Opportunity::query()
            ->when($category, fn ($query) => $query->where('category', $category))
            ->when($q, fn ($query) => $query->where(
                fn ($sub) => $sub->where('title', like_op(), "%{$q}%")->orWhere('company', like_op(), "%{$q}%")
            ))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function createOpportunity(int $userId, array $data): Opportunity
    {
        return Opportunity::create([
            'user_id' => $userId,
            'title' => $data['title'],
            'company' => $data['company'] ?? '',
            'location' => $data['location'] ?? '',
            'salary' => $data['salary'] ?? '',
            'category' => $data['category'] ?? '',
            'skills' => $data['skills'] ?? [],
        ]);
    }

    /** تقديم مثاليّ — لا يُكرَّر لنفس الفرصة. */
    public function apply(int $userId, int $opportunityId): Application
    {
        Opportunity::findOr($opportunityId, fn () => abort(404, __('Opportunity not found')));

        return Application::firstOrCreate([
            'user_id' => $userId,
            'opportunity_id' => $opportunityId,
        ]);
    }

    public function listRequests(?string $type, int $perPage = 15): LengthAwarePaginator
    {
        $this->seedRequests();

        return MarketRequest::query()
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function listMyRequests(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return MarketRequest::where('user_id', $userId)->orderByDesc('id')->paginate($perPage);
    }

    private function seedOpportunities(): void
    {
        if (Opportunity::count() > 0) {
            return;
        }

        Opportunity::insert([
            ['title' => 'مهندس واجهات أمامية', 'company' => 'شركة أفق', 'location' => 'الرياض', 'salary' => '١٢٠٠٠–١٨٠٠٠', 'category' => 'tech', 'skills' => json_encode(['Vue', 'TypeScript']), 'created_at' => now(), 'updated_at' => now()],
            ['title' => 'أخصائي تحليل بيانات', 'company' => 'داتا بلس', 'location' => 'عن بُعد', 'salary' => '١٥٠٠٠–٢٢٠٠٠', 'category' => 'data', 'skills' => json_encode(['SQL', 'Python']), 'created_at' => now(), 'updated_at' => now()],
            ['title' => 'مصمم تجربة مستخدم', 'company' => 'استوديو نون', 'location' => 'جدة', 'salary' => '١٠٠٠٠–١٤٠٠٠', 'category' => 'design', 'skills' => json_encode(['Figma']), 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function seedRequests(): void
    {
        if (MarketRequest::count() > 0) {
            return;
        }

        MarketRequest::insert([
            ['type' => 'job', 'title' => 'مطوّر Backend بدوام كامل', 'org' => 'منصّة رِفد', 'state' => 'new', 'compensation' => 'راتب شهري', 'remote' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'project', 'title' => 'بناء متجر إلكتروني', 'org' => 'متجر السنابل', 'state' => 'reviewing', 'compensation' => 'بالمشروع', 'remote' => true, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'consultation', 'title' => 'استشارة معمارية سحابية', 'org' => 'شركة مدى', 'state' => 'new', 'compensation' => 'بالساعة', 'remote' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
