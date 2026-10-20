<?php

use App\Http\Middleware\SetLocaleFromRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('api', SetLocaleFromRequest::class);

        // Locally the storefront calls the API directly and forwards the shopper's IP in
        // X-Forwarded-For, trusted only from its address. Behind a hosting proxy (TRUSTED_PROXIES=*),
        // the forwarded scheme and host also make URLs https; shopper IPs then come from the
        // storefront's key instead (App\Support\ShopperIp).
        $proxies = (string) env('TRUSTED_PROXIES', '127.0.0.1,::1');
        $middleware->trustProxies(
            at: $proxies === '*' ? '*' : array_filter(array_map('trim', explode(',', $proxies))), // '*' only works as a string
            headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
