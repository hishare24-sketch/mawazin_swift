<?php

namespace App\Http\Traits;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait ApiResponder
{
    /** GET عنصر واحد أو object غير مقسّم. */
    public function dataResponse($data, array $extra = []): array
    {
        return ['data' => $data, ...$extra];
    }

    /**
     * GET قائمة مقسّمة عبر Resource → {data, meta}.
     * يخرّط عناصر الصفحة عبر الـResource المعطى ثمّ يبني الغلاف الموحّد.
     * عقد موحّد لكل القوائم (عميل + أدمن) — يقابل getPage/useAdminResource أماميًّا.
     */
    public function paginatedResource(LengthAwarePaginator $paginator, string $resource, array $extra = []): array
    {
        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($model) => (new $resource($model))->resolve())
        );

        return $this->dashboardResponse($paginator, $extra);
    }

    /** perPage آمن من الاستعلام (افتراضيّ 15، محدود بـ$max منعًا لإغراق الخادم). */
    public function perPage(Request $request, int $default = 15, int $max = 100): int
    {
        return min(max((int) $request->query('perPage', (string) $default), 1), $max);
    }

    /** GET قائمة مقسّمة صفحات (->paginate()) → {data, meta}. */
    public function dashboardResponse($collection, array $data = []): array
    {
        $isPaginator = is_object($collection) && method_exists($collection, 'items');

        $response = [
            'data' => $isPaginator ? $collection?->items() : $collection,
            ...$data,
        ];

        try {
            $response['meta'] = [
                'current_page' => $collection?->currentPage(),
                'last_page' => $collection?->lastPage(),
                'itemPerPage' => $collection?->perPage(),
                'total' => $collection?->total(),
            ];
        } catch (\Throwable $th) {
            $response['meta'] = null;
        }

        return $response;
    }

    /** بعد PUT/PATCH ناجح. */
    public function updatedResponse(mixed $data = null, ?string $message = null): array
    {
        $body = ['message' => $message ?? __('Updated successfully')];
        if ($data !== null) {
            $body['data'] = $data;
        }

        return $body;
    }

    /** بعد POST ناجح (201). */
    public function createdResponse(mixed $data = null, ?string $message = null): JsonResponse
    {
        $body = ['message' => $message ?? __('Created successfully')];
        if ($data !== null) {
            $body['data'] = $data;
        }

        return response()->json($body, 201);
    }

    /** خطأ بزنس متوقّع. */
    public function errorResponse(string $message, int $code = 400): JsonResponse
    {
        return response()->json(['message' => $message], $code);
    }

    /** فعل ممنوع بقاعدة بزنس (405 نمط الفريق). */
    public function forbiddenResponse(?string $message = null): JsonResponse
    {
        return response()->json(['data' => null, 'message' => $message ?? __('This action is not allowed')], 405);
    }
}
