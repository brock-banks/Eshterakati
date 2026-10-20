# Deploying

The shop runs as two pieces:

| Piece | Folder | Host | Address (example) |
| --- | --- | --- | --- |
| Storefront (Next.js) | `frontend/` | Vercel | `https://eshterakati.vercel.app` |
| API and `/admin` (Laravel) | `backend/` | Railway | `https://eshterakati-api.up.railway.app` |

The storefront's server talks to the API. Shoppers never call the API directly. Both deploy
automatically from GitHub whenever `main` changes.

You will need:
- a GitHub login (Railway and Vercel both sign in with it)
- a card for Railway's Hobby plan ($5/month, which includes $5 of usage; this shop normally fits inside it)

## 1. Make a shared key

The storefront proves to the API that it is the storefront by sending a secret key. Make one
long random string, for example with a password manager (40+ letters and digits, no spaces).
You'll paste the same value into Railway (`SHOP_STOREFRONT_KEY`) and Vercel (`STOREFRONT_KEY`).

## 2. Deploy the API on Railway

1. Go to [railway.com](https://railway.com), sign in with GitHub and choose the **Hobby** plan.
2. **New Project → Deploy from GitHub repo → brock-banks/Eshterakati.** If Railway asks for
   access to the repo, allow it.
3. Open the new service → **Settings**:
   - **Source → Root Directory:** `/backend`
   - **Config-as-code → Railway config file:** `/backend/railway.json`

   Railway then builds `backend/Dockerfile`.
4. **Add a volume:** in the project canvas, right-click the service → **Attach volume** →
   mount path **`/data`**. The database, uploaded receipts and the app's encryption key live
   there, so they survive every redeploy. Never delete this volume.
5. **Settings → Networking → Generate Domain.** Note the address, for example
   `https://eshterakati-api.up.railway.app`.
6. **Variables** (use **Raw Editor** to paste them all at once):

   ```
   APP_NAME=Eshterakati
   APP_URL=https://eshterakati-api.up.railway.app
   FRONTEND_URL=https://eshterakati.vercel.app
   SHOP_STOREFRONT_KEY=the-key-from-step-1
   SHOP_ADMIN_EMAIL=you@example.com
   SHOP_ADMIN_PASSWORD=a-strong-password
   PAY_BANKAK_ACCOUNT_NAME=Account holder name
   PAY_BANKAK_ACCOUNT_NUMBER=1234567
   PAY_OCASH_ACCOUNT_NAME=
   PAY_OCASH_ACCOUNT_NUMBER=
   PAY_FAWRY_ACCOUNT_NAME=
   PAY_FAWRY_ACCOUNT_NUMBER=
   ```

   - Use your real addresses for `APP_URL` and `FRONTEND_URL`.
   - A payment method only shows at checkout once its account number is set.
   - `SHOP_ADMIN_EMAIL` also receives an email for each new receipt and problem report (see step 4).
   - Optional: `SHOP_SEED_DEMO=1` loads the demo catalogue once, so you can try a full order.
     Delete the demo deals in `/admin` before you open the shop.

7. Railway deploys. When it's done:
   - `https://…railway.app/up` shows a green "Application up" page.
   - `https://…railway.app/admin` shows the login page. Sign in with `SHOP_ADMIN_EMAIL` and
     `SHOP_ADMIN_PASSWORD`.

On every deploy the server:
- runs the database migrations
- makes sure the admin account exists (it never changes an existing password)
- starts the job that releases codes from unpaid orders every minute

You don't need to set `APP_KEY`. One is generated on the first boot and kept on the volume.

## 3. Point the storefront at it (Vercel)

1. In Vercel, open the project → **Settings → General**:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js

   If you have two Vercel projects for this repo, keep one and delete the other.
2. **Settings → Environment Variables** (Production and Preview):

   ```
   API_URL=https://eshterakati-api.up.railway.app/api/v1
   STOREFRONT_KEY=the-key-from-step-1
   NEXT_PUBLIC_CURRENCY=SDG
   ```
3. **Deployments → … → Redeploy.** The storefront now shows your catalogue, and checkout lists
   the payment methods you configured.

## 4. Email (optional, recommended)

Without a mail service, emails are only written to the Railway logs. The shop still works,
because customers follow their order on the order page. To send real emails, sign up with an
SMTP provider (for example [Resend](https://resend.com), whose free tier covers a small shop),
verify your sending domain, and add to Railway:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USERNAME=resend
MAIL_PASSWORD=your-resend-api-key
MAIL_FROM_ADDRESS=shop@your-domain.com
MAIL_FROM_NAME=Eshterakati
```

## Backups

Everything the shop knows (orders, codes, receipts) lives in the `/data` volume. Turn on
Railway's volume backups if your plan has them. If not, download a copy before big changes.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The deploy fails at "healthcheck" | Railway → Deployments → **View logs**. A migration or a typo in a variable usually shows there. |
| `/admin` login says the credentials are wrong | The admin is created on the first deploy with those values. If you changed `SHOP_ADMIN_PASSWORD` afterwards, the old password still applies. |
| Checkout says payments aren't set up | Set at least one `PAY_…_ACCOUNT_NUMBER` in Railway, then redeploy the storefront so it refetches the methods. |
| Everyone hits "too many requests" at once | `STOREFRONT_KEY` (Vercel) and `SHOP_STOREFRONT_KEY` (Railway) must be identical. |
| The storefront shows demo deals that aren't in `/admin` | `API_URL` isn't set in Vercel, so it's using the built‑in demo catalogue. |
