# Eshterakati — frontend

Next.js 16 (App Router, React 19, TypeScript). Implements the UX in
[`../docs/UX-SPEC.md`](../docs/UX-SPEC.md) with the Apple-HIG design system in
[`../design-system/MASTER.md`](../design-system/MASTER.md).

```bash
cp .env.example .env.local   # point API_URL at the Laravel API, or remove it to use fixtures
npm install
npm run dev                   # http://localhost:3000
npm run lint && npx tsc --noEmit && npm run build
```

## How it fits together

| Path | Role |
| --- | --- |
| `src/app/[lang]/**` | All routes, per language (`/ar` default, `/en`). `src/proxy.ts` adds the prefix to bare URLs. Server Components read `params.lang` and use `getDictionary(lang)` and `formatters(lang)`. |
| `src/i18n/` | Locale config, dictionaries (`en.ts` is the source of truth, `ar.ts` must match), `t()` and Arabic‑aware `plural()`, and `<I18nProvider>` / `useI18n()` for client components. |
| `src/app/actions.ts` | Server Actions: `createOrder`, `getOrder`, `submitReceipt` → Laravel. They map 422/404/429 into messages people can act on. |
| `src/components/OrderView.tsx` | `/orders/[id]`: transfer details, receipt upload (resized in the browser), review state, codes. Polls every 15s. |
| `src/lib/api.ts` | Laravel client. With no `API_URL`, serves `src/lib/fixtures.ts` (mirrors the Laravel seeder) for browsing. Checkout needs the API. |
| `src/lib/store.ts` | Guest state (bag, orders with their access tokens, purchased codes, preferences) in `localStorage`, read through `useSyncExternalStore`. |
| `src/components/UIProvider.tsx` | Sheet (`<dialog>`), toasts, theme/RTL sync and focus management on navigation. |
| `src/app/globals.css` | Design tokens and components — semantic tokens only, logical properties for RTL. |

Arabic: numbers use Western digits (`ar-SD-u-nu-latn`) to match banking apps. Mixed‑direction values (references, amounts, codes) are wrapped in `<bdi>` or isolates, and search folds Arabic spelling variants (أ/إ/آ, ة/ه, ى/ي).

Notes for this Next.js version: `params` is a Promise, Cache Components is on (runtime
reads such as `useSearchParams`, or `usePathname` on `/orders/[id]`, sit inside `<Suspense>`), and `error.tsx` receives `retry`.
