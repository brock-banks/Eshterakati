<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API responses (catalogue copy, validation messages) follow the storefront's
 * language, sent as Accept-Language. Anything else falls back to English.
 */
class SetLocaleFromRequest
{
    public const SUPPORTED = ['ar', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        // getPreferredLanguage() falls back to the first supported locale, so match explicitly.
        $locale = collect($request->getLanguages())
            ->map(fn (string $tag) => strtolower(strtok($tag, '_-')))
            ->first(fn (string $lang) => in_array($lang, self::SUPPORTED, true), 'en');
        app()->setLocale($locale);

        $response = $next($request);
        $response->headers->set('Content-Language', app()->getLocale());
        $response->setVary('Accept-Language', false);

        return $response;
    }
}
