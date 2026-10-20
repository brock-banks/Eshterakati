# Eshterakati

A store for buying verified coupon and gift codes at a discount. Codes appear
instantly after payment, are emailed as a backup, and are covered by a
money‑back promise.

| Folder | What's in it |
| --- | --- |
| [`docs/UX-SPEC.md`](docs/UX-SPEC.md) | UX spec: users, principles, information architecture, flows, screen specs, accessibility, open decisions |
| [`design-system/MASTER.md`](design-system/MASTER.md) | Apple Human Interface Guidelines design system for the web: tokens, components, rules |
| [`frontend/`](frontend) | Next.js 16 + React 19 storefront |
| [`backend/`](backend) | Laravel 13 JSON API: catalogue, encrypted code inventory, orders, order email |

## Run it locally

Requirements: PHP 8.3+, Composer, Node 20+.

```bash
# 1. API — http://localhost:8000
cd backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve

# 2. Storefront — http://localhost:3000
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

The storefront also runs without the API: remove `API_URL` from `.env.local` and it
uses a built-in copy of the demo catalogue.

## API (v1)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/categories` | With listed‑deal counts |
| `GET` | `/api/v1/deals` | `q`, `category`, `featured`, `sort=popular\|savings\|ending` |
| `GET` | `/api/v1/deals/{slug}` | Includes `in_stock` per option |
| `POST` | `/api/v1/orders` | `{ email, items: [{ option_id, quantity }] }` → order with plaintext codes (only in this response). Throttled to 10/min. |

Prices are integers in minor units (`*_cents`). Codes are encrypted at rest and assigned
from inventory inside a transaction, so an option can't be oversold.

## Checks

```bash
cd backend && php artisan test && vendor/bin/pint --test
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

## Not built yet

Payments are stubbed (orders are marked paid immediately, and checkout shows **Test mode**).
Accounts, problem reports and refunds are designed in the UX spec but not implemented.
Merchants in the seed data are fictional placeholders. See "Open decisions" in the UX spec.
