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
| `src/app/**/page.tsx` | Server Components. Catalogue data comes from `src/lib/api.ts` (`'use cache'`, 1‑minute lifetime). |
| `src/app/actions.ts` | `placeOrder` Server Action → `POST /api/v1/orders` on Laravel. Maps 422/429 into messages people can act on. |
| `src/lib/api.ts` | Laravel client. With no `API_URL`, serves `src/lib/fixtures.ts` (mirrors the Laravel seeder). |
| `src/lib/store.ts` | Guest state (bag, purchased codes, preferences) in `localStorage`, read through `useSyncExternalStore`. |
| `src/components/UIProvider.tsx` | Sheet (`<dialog>`), toasts, theme/RTL sync and focus management on navigation. |
| `src/app/globals.css` | Design tokens and components — semantic tokens only, logical properties for RTL. |

Notes for this Next.js version: `params` is a Promise, Cache Components is on (runtime
reads such as `useSearchParams` sit inside `<Suspense>`), and `error.tsx` receives `retry`.
