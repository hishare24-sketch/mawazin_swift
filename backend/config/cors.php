<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | المسارات المسموح بها عبر الأصول. أُضيف `broadcasting/auth` كي يستطيع
    | عميل الواجهة (Vite على منفذ مغاير) توثيق قنوات Reverb الخاصّة بتوكن Bearer.
    | التوثيق بالتوكن لا الكوكيز فـ supports_credentials يبقى false.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
