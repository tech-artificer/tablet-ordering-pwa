Trusted Proxies (Laravel) and Nginx guidance

1) TrustProxies Laravel middleware

Edit `App\Http\Middleware\TrustProxies.php` and ensure it trusts your reverse proxy (nginx/load-balancer). Example if you trust all proxies (use carefully):

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Fideloper\Proxy\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    protected $proxies = '*'; // or ['10.0.0.1', '10.0.0.2'] - list your proxy IPs

    protected $headers = Request::HEADER_X_FORWARDED_ALL;
}
```

Important: use `'*'` only in controlled environments. Prefer listing proxy IPs.

2) Nginx sample to forward X-Forwarded-For

In your nginx site config (proxying to PHP-FPM or upstream), ensure forwarding headers are present:

```
location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:8000; # or your upstream
}
```

3) Logging headers to debug

Temporarily add logging to your controller or middleware to see what IPs/headers arrive:

```php
\Log::info('Incoming headers for device auth', [
  'x_forwarded_for' => $request->header('X-Forwarded-For'),
  'x_real_ip' => $request->header('X-Real-IP'),
  'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null,
  'request_ip' => $request->ip(),
]);
```

4) Testing checklist

- After applying TrustProxies and nginx changes, request `GET /device/ip` (or hit your device login endpoint) and check logs for which IP is used.
- Register from a device and inspect `ip_used` in the controller's JSON response (see patched controller above).
- If you still get server/public IP, check your load balancer/edge proxy — it must forward `X-Forwarded-For`.

5) Security notes

- Do not accept arbitrary client-supplied IPs for production unless you validate private-range as shown in the controller patch.
- Prefer server-side detection via `request()->ip()` with properly configured proxies.
