# Eshterakati

A store in Sudan for gift cards and subscription codes, priced in Sudanese pounds.
Customers pay by bank transfer from Bankak, O‑Cash or Fawry, upload a screenshot of the
receipt, and get their codes as soon as the store approves the payment. Accounts are optional.
The storefront is **Arabic by default** (`/ar`, right‑to‑left) with English at `/en`.

| Folder | What's in it |
| --- | --- |
| [`docs/UX-SPEC.md`](docs/UX-SPEC.md) | UX spec: users, principles, information architecture, flows, screen specs, accessibility, open decisions |
| [`design-system/MASTER.md`](design-system/MASTER.md) | Apple Human Interface Guidelines design system for the web: tokens, components, rules |
| [`frontend/`](frontend) | Next.js 16 + React 19 storefront |
| [`docs/PAYMENTS-SUDAN.md`](docs/PAYMENTS-SUDAN.md) | Research on Sudanese payment APIs (none public) and how receipt payments work |
| [`backend/`](backend) | Laravel 13: JSON API (catalogue, encrypted code stock, receipt‑paid orders, emails) and the **Filament admin** at `/admin` |

## Run it locally

Requirements: PHP 8.3+, Composer, Node 20+.

```bash
# 1. API — http://localhost:8000
cd backend
composer install
cp .env.example .env && php artisan key:generate
# set PAY_BANKAK_ACCOUNT_NUMBER etc. in .env — only methods with an account number are offered
touch database/database.sqlite
php artisan migrate --seed          # locally also creates admin@example.com / password
php artisan serve
php artisan schedule:work           # second terminal: releases codes from unpaid orders

# 2. Storefront — http://localhost:3000
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

Admin: http://localhost:8000/admin. Review receipts (Orders), manage deals and prices, and
**Add codes** to stock. Create a real admin with `php artisan make:filament-user` and set `is_admin = 1`.

Without the API (`API_URL` unset) the storefront still browses a built‑in copy of the
catalogue, but checkout needs the backend.

## API (v1)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/categories` | With listed‑deal counts |
| `GET` | `/api/v1/deals` | `q`, `category`, `featured`, `sort=popular\|savings\|ending` |
| `GET` | `/api/v1/deals/{slug}` | Includes `in_stock` per option |
| `GET` | `/api/v1/payment-methods` | Wallets that have an account number configured |
| `POST` | `/api/v1/orders` | `{ phone, email?, payment_method, items: [{ option_id, quantity }] }` → reserves codes, returns transfer details and a one‑time `access_token` |
| `GET` | `/api/v1/orders/{id}` | Header `X-Order-Token`. Includes plaintext codes once paid. |
| `POST` | `/api/v1/orders/{id}/receipt` | Multipart `receipt` (JPG/PNG/WebP ≤ 8 MB) + `transaction_reference`. Header `X-Order-Token`. |

Order states: `awaiting_payment → in_review → paid`. A rejection sends the order back to
`awaiting_payment` with a reason. `expired` happens when no receipt arrives in time, and the codes go back
on sale. Prices are integers in minor units (`*_minor`). Codes are encrypted at rest. A transaction
number or receipt image can't pay for two orders.

## Languages

- **Storefront:** every route lives under `/ar` or `/en` (`frontend/src/app/[lang]`). `/` and other un‑prefixed links go to Arabic, or to the language last picked with the header or Account switcher (saved in the `lang` cookie). UI strings are in `frontend/src/i18n/dictionaries/{en,ar}.ts`. English is the source of truth, and TypeScript fails the build if Arabic is missing a key.
- **Catalogue content:** categories, deals and options have Arabic fields (`name_ar`, `title_ar`, `blurb_ar`, `region_ar`, `label_ar`), edited in the admin. When an Arabic field is empty the English one is shown.
- **API:** sends `Accept-Language: ar|en` and gets localised copy and validation messages back. Each order stores its language, so its emails (right‑to‑left in Arabic) and links match.
- **Admin:** stays in English. Rejection reasons are stored as codes and shown to customers in their language (`backend/lang/{en,ar}/shop.php`).

## Checks

```bash
cd backend && php artisan test && vendor/bin/pint --test
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

## Not built yet

Customer accounts (orders are kept on the device and in the email link),
"report a problem" and refunds, and a production mail provider (local dev writes emails to the log).
Merchants in the seed data are fictional, and prices use a placeholder exchange rate. Set real
prices in the admin. See "Still open" in the UX spec.
