#!/bin/sh
# Boots the API on the host's $PORT. Safe to run on every deploy.
set -e
cd /app

# Everything that must outlive a deploy goes on the volume at /data.
mkdir -p /data/storage/app/private /data/storage/app/public \
         /data/storage/framework/cache/data /data/storage/framework/sessions /data/storage/framework/views \
         /data/storage/logs
if [ ! -L storage ]; then
  rm -rf storage
  ln -s /data/storage storage
fi
touch /data/database.sqlite

# One encryption key for the life of the shop: encrypted columns can't be read with another.
if [ -z "$APP_KEY" ]; then
  if [ ! -s /data/app_key ]; then
    php -r 'echo "base64:".base64_encode(random_bytes(32));' > /data/app_key
  fi
  APP_KEY=$(cat /data/app_key)
  export APP_KEY
fi

php artisan migrate --force
php artisan shop:admin
# Optional demo catalogue, once (SHOP_SEED_DEMO=1). Delete it in /admin before going live.
if [ "$SHOP_SEED_DEMO" = "1" ] && [ ! -e /data/.demo_seeded ]; then
  php artisan db:seed --class=CatalogSeeder --force
  touch /data/.demo_seeded
fi
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan optimize

# Expire unpaid orders (and anything else scheduled) every minute.
(while true; do php artisan schedule:run --no-interaction || true; sleep 60; done) &

exec frankenphp php-server --listen ":${PORT:-8080}" --root /app/public
