# Payments in Sudan — research notes

Researched October 2026 for the decision "how do customers pay?". **Bottom line:** none of the wallets
Sudanese shoppers use publishes a merchant API for online checkout, so v1 uses **bank transfer +
receipt upload + manual approval**, behind a payment‑method abstraction so a gateway can be added later.

## What exists

| Option | Who | API for online checkout? | Notes |
| --- | --- | --- | --- |
| **Bankak (mBOK)** | Bank of Khartoum | **No public API found** | The dominant app (reported 7m+, later 10m+ users). Transfers to BOK accounts, other banks (via EBS) and wallets. Has QR "Bankak Pay" for shops, which confirms by SMS to the merchant. Repeated outages, and notifications sometimes don't arrive. |
| **O‑Cash** | Omdurman National Bank | No public API found | Common second wallet. |
| **Fawry** | Faisal Islamic Bank | No public API found | Not the Egyptian Fawry. |
| **Cashi** | Soug al‑Sudan (systems by Egypt's Fawry) | No developer docs found | Licensed by the Central Bank. Mostly POS and bill payments. |
| **SyberPay** | Sybertech | No developer docs found | Appears only in third‑party plugin lists. |
| **EBS** | Central Bank switch | Bank‑to‑bank only | Banks integrate with it. Merchants reach it through a bank or gateway. |
| **YallaPay** | Gateway | **Advertises APIs** | Lists Bravo as live, with Bankak and Cashi "coming soon". Its site didn't resolve during research, so this is unverified. **Worth contacting.** |
| Stripe / PayPal | — | Not available | Sudan is listed as unsupported, and sanctions history keeps global processors out. |

Every Sudanese WooCommerce integration found (e.g. "Sudan Online Payments for WooCommerce",
"WC Sudan Payment Gateway") works the same way: show the account number → customer transfers →
uploads a receipt → **admin verifies manually**. That pattern is what shoppers already expect.

## What we built

1. Checkout reserves the codes and shows the transfer details: amount (copyable, digits only), account number, and a short reference (`ESH-XXXXX`) to write in the transfer note.
2. The customer uploads a screenshot and the **transaction number**. The image is resized in the browser to keep uploads small on mobile data.
3. The admin sees the receipt next to *the amount to look for* and approves **only after seeing the money in the account**. Screenshots are easy to fake, so the receipt is evidence, not proof.
4. Approval releases the codes. They appear on the order page and in My Codes, and are emailed if an address was given.

### Fraud controls
- The same **transaction number** (compared on letters and digits only) or the same **image hash** can't be used for two orders.
- Receipts are private files that only admins can open.
- Codes stay reserved, not sold, until approval. Unpaid orders expire after `SHOP_PAYMENT_WINDOW_MINUTES` (default 180) and the codes go back on sale. Orders in review never expire on their own.
- Order pages need a per‑order token. A wrong token looks like a missing order.

## Next steps
- Ask **YallaPay** and **Bank of Khartoum** (merchant services) about API access or automated confirmation. If one exists, add it as another entry in `config/shop.php` → `payment_methods` with an automatic confirmation driver.
- Staff the review queue during stated hours (`SHOP_REVIEW_HOURS`). The admin gets an email for every receipt.

## Sources
- [Bankak account — Bank of Khartoum](https://bankofkhartoum.com/sudan/mobile-money/)
- [Bank‑to‑bank transfers via Bankak — Bank of Khartoum](https://bankofkhartoum.com/sudan/news-detail/bank-to-bank-transfers-now-available-via-bankak-app)
- [Sudan public frustrated by Bankak glitches — Dabanga](https://www.dabangasudan.org/en/all-news/article/sudan-public-remain-frustrated-by-bankak-app-glitches-despite-update)
- [Millions stranded as banking app goes offline — The New Arab](https://www.newarab.com/news/sudan-millions-stranded-banking-app-goes-offline)
- [Digital money apps a lifeline for Sudanese — The New Humanitarian](https://www.thenewhumanitarian.org/news-feature/2024/02/07/sudan-war-digital-money-online-banking-apps)
- [Supporting digital payments in Sudan — FSD Africa (2022)](https://www.fsdafrica.org/wp-content/uploads/2022/09/22-09-19-Supporting-Digital-Payments-in-Cash-Sudan-Final.pdf)
- [Cashi](https://getcashi.com/en/consumer) · [YallaPay Sudan](https://yallapaysudan.com/en)
- [Sudan Online Payments for WooCommerce](https://wordpress.org/plugins/sudan-online-payments-for-woocommerce/) · [WC Sudan Payment Gateway](https://github.com/AminOmer/WC-Sudan-Payment-Gateway)
- [Stripe restricted countries summary](https://help.tithe.ly/hc/en-us/articles/37146111062551-Stripe-Restricted-Country-Policy) · [Freemius supported countries](https://freemius.com/help/documentation/selling-with-freemius/supported-countries.md)
