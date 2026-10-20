# Production image for the Laravel API and /admin: FrankenPHP serves public/, a loop runs the
# scheduler, and everything that must survive a redeploy lives on a volume mounted at /data
# (the SQLite database, uploaded receipts and screenshots, and the generated APP_KEY).
FROM dunglas/frankenphp:1-php8.4

RUN install-php-extensions intl zip pdo_sqlite opcache \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-shop.ini"
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --no-dev \
 && php artisan filament:assets \
 && chmod +x docker/start.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/data/database.sqlite \
    SESSION_DRIVER=database \
    CACHE_STORE=database \
    QUEUE_CONNECTION=sync \
    TRUSTED_PROXIES=*

EXPOSE 8080
CMD ["/app/docker/start.sh"]
