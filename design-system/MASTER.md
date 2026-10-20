# Eshterakati design system — MASTER

Apple Human Interface Guidelines, adapted for the web. **Source of truth for tokens:** `frontend/src/app/globals.css` (section 1). Components reference semantic tokens only, never raw colour values.

> Page‑specific deviations go in `design-system/pages/<page>.md` and override this file for that page. None exist yet.

## Foundations

### Typography — Alexandria, compact scale

**Alexandria** (Arabic + Latin, variable weight) is bundled with `next/font/google` in `app/[lang]/layout.tsx` and exposed as `--font-alexandria`, so Windows, Android and Apple devices all render the same face. The system UI font is only a fallback while it loads.

Alexandria sets larger than SF at the same pixel size, so the scale sits a step below the iOS defaults. Titles use 600 because Alexandria's 700 is heavy. Running text uses `--lh-text`: 1.5, or 1.65 in Arabic for its taller letters.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `--t-large-title` | 28 (32 on ≥768) / 1.2 | 700 | One per page, the `h1` |
| `--t-title1` | 24 / 1.25 | 600 | Deal title |
| `--t-title2` | 20 / 1.3 | 600 | Section titles |
| `--t-title3` | 17 / 1.3 | 600 | Empty‑state titles |
| `--t-headline` | 15 / 1.35 | 600 | Card titles, list emphasis |
| `--t-body` | 15 / `--lh-text` | 400 | Body |
| `--t-callout` | 14 / `--lh-text` | 400 | Ledes |
| `--t-subhead` | 13 / `--lh-text` | 400 | Secondary copy |
| `--t-footnote` | 12 / 1.4 | 400 | Meta, list headers |
| `--t-caption` | 11 / 1.35 | 400 | Smallest allowed (progress labels, tab bar) |
| `--t-field` | 16 / 1.4 | 400 | Text fields and search. Below 16px iOS Safari zooms on focus. |

Numbers that change (prices, countdowns, quantities) use `font-variant-numeric: tabular-nums`. Codes use `ui-monospace`/SF Mono.

### Controls — compact, iOS grouped

| Token | Size | Use |
| --- | --- | --- |
| `--btn-h` | 40px | Buttons |
| `--btn-h-lg` | 46px | The main action of a screen or sheet (full width) |
| `--btn-h-sm` | 32px | Small buttons, segmented control segments |
| `--field-h` | 44px | Text fields, selects, search |

On touch screens (`pointer: coarse`) buttons and segments keep a 44px tap area with an invisible `::after`, so the visuals stay compact without small targets.

- **Text fields** are filled (`--fill-2`) with no border. Focus shows a 2px tint ring on the card colour; errors a 2px red ring on `--red-bg`.
- **Selects** use the same field with a drawn chevron (left in RTL), not the browser's arrow.
- **Radios** in grouped lists (`.pay-option`) are a ring that fills with the tint and a white tick when chosen; the chosen row gets `--tint-bg`.
- **Option cards** (`.option`) keep their corner check. Switches and the segmented control follow iOS.

### Colour — semantic tokens (light / dark)

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--bg` | `#f5f5f7` | `#000` | systemGroupedBackground |
| `--bg-elevated` | `#fff` | `#1c1c1e` | Cards, lists |
| `--bg-sheet` / `--bg-sheet-card` | `#f2f2f7` / `#fff` | `#1c1c1e` / `#2c2c2e` | Modal sheets |
| `--label` | `#1d1d1f` | `#f5f5f7` | Primary text |
| `--label-2` | `#6e6e73` (5.1:1) | `#a1a1a6` | Secondary text. The iOS default (60% alpha) fails AA, so it is darkened. |
| `--label-3` | `#8e8e93` | `#7c7c80` | Placeholders and decorative only |
| `--tint` | `#0071e3` | `#0071e3` | Filled buttons (white text 4.7:1) |
| `--tint-text` | `#0066cc` | `#2997ff` | Links and tinted text (5.6:1). systemBlue `#007AFF` fails AA for text. |
| `--green` / `--green-bg` | `#1f7a35` / 16% | `#30d158` / 18% | Sale badges and discounts — always with text ("Sale · −13%"), never colour alone |
| `--orange` / `--orange-bg` | `#b03000` / 16% | `#ff9f0a` / 18% | Countdowns |
| `--red` | `#d70015` | `#ff453a` | Errors, destructive actions, the badge |
| `--separator` | 60,60,67 @ 20% | 84,84,88 @ 60% | Hairlines (0.5px on retina) |
| `--fill`, `--fill-2` | 118,118,128 @ 12% / 8% | @ 24% / 16% | Controls, code field |
| `--material`, `--material-thick` | white @ 72% / 88% | `#161617` @ 72% / `#1c1c1e` @ 88% | With `backdrop-filter: saturate(180%) blur(20px)` |
| `--scrim` | black 40% | black 60% | Sheet backdrop |

Theme: `prefers-color-scheme` by default. `html[data-theme="light"|"dark"]` forces one, set from Account → Theme before first paint.

**Merchant hue.** Each merchant has a `hue` (0–360). Tiles, passes and deal art build gradients from it: `hsl(h 78% 52%) → hsl(h+32 80% 40%)` (darker in dark mode). This is a placeholder until licensed logos exist. Tiles are `aria-hidden` because the merchant name is always in text.

### Spacing, radius, elevation, motion

- **Spacing:** 4pt grid. `--s-1…--s-16` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Gutter is 16 on phones and 24 on ≥768. Max content width is 1120.
- **Radius:** 7 (settings icon) · 10 (search) · 12 (fields, lists, code field, main button) · 18 (cards) · 24 (hero, deal art) · pill (buttons, chips, badges). Sheets use 14 at the top on phones and 22 on desktop.
- **Elevation:** `--shadow-1` for resting cards and `--shadow-2` for hover, hero and sheets. Dark mode swaps shadows for a 0.5px light edge.
- **Motion:** 150ms (press) · 250ms (state) · 400ms (sheet). The sheet curve is `cubic-bezier(0.32, 0.72, 0, 1)`, the iOS spring. Press feedback is `scale(.97–.98)`. Only `transform` and `opacity` are animated. `prefers-reduced-motion` turns all motion off.
- **Layers:** sticky 30 · bars 40 · toast 100. Sheets use the native `<dialog>` top layer.

### Icons

24×24, 1.75 stroke, round caps and joins — an SF Symbols‑like line style (SF Symbols are licensed for Apple‑platform apps only, so they aren't used on the web). One sprite (`IconSprite.tsx`) and `<Icon name>`. Sizes are 16 / 18 / 22 / 24 / 28. Directional icons get `.flip-rtl`. No emoji as icons.

## Components

| Component | Class / file | Rules |
| --- | --- | --- |
| Button | `.btn` + `-filled` / `-tinted` / `-gray` / `-plain` / `-destructive`, `-lg` (46px, 12 radius, full width), `-sm` (32px) | Height 40; 44px tap area on touch screens. One filled button per view. Title Case labels, as in iOS ("Add to Bag"). |
| Segmented control | `SegmentedControl.tsx` | `role="radiogroup"`, roving tabindex, ←/→ (reversed in RTL), Home/End. 2–3 segments. Filters only, not navigation. |
| Switch | `.switch` (`input[role=switch]`) | Inside a `<label class="list-row">` so the whole row toggles. Green when on. |
| Inset grouped list | `.list` / `.list-row` / `.list-header` / `.list-footer` | Settings‑style. Separators are inset past the icon. Rows ≥ 52px. Chevron for navigation. |
| Header | `Header.tsx` | Brand at the start, sections (Discover / Browse / My Codes) truly centred as a pill switcher (≥768), actions at the end: search, language (globe + "EN"/"ع"), bag, account. Phones keep brand, language and bag; the tab bar navigates. |
| Deal card | `DealCard.tsx` | Gift‑card face (merchant gradient, monogram, name, one white "−13%" badge) over the title, price and a tinted **Buy** button. No shadow at rest; lifts on hover. Two per row on phones, auto‑fill grid ≥640. The card links to the deal; Buy sits above that link: one value in stock → checkout, several → the value picker sheet (`QuickBuySheet.tsx`). The countdown appears only in the last 24 hours, as orange text (`EndsSoon`). |
| Hero | `.hero` | One per page. White "View Deal" button on the tinted gradient. |
| Badge | `.badge-save` / `-ends` / `-verified` / `-neutral` | Always text, optionally with an icon. Colour is never the only signal. |
| Option picker | `.option` radio cards | 2px tint ring and check when selected. Disabled with "Sold out" text. |
| Stepper | `.stepper` | − / value / +, range 1–10. The value is announced through `output[aria-live]`. |
| Code field | `CodeField.tsx` | Masked by default, eye toggle (`aria-pressed`), Copy works while masked. Icon‑only Copy below 480px. LTR‑isolated. |
| Pass | `.pass` | Wallet‑style: hue header, perforation, actions. Used passes are desaturated. |
| Sheet | `UIProvider.tsx` `<dialog class="sheet">` | Bottom sheet with a grabber on phones, centred card on ≥768. Esc, backdrop and × close it. Locked while processing. Focus returns to the trigger. |
| Toast | `.toast` | Bottom, above the tab bar. At the top inside sheets. 3s, or 5s with an action (usually **Undo**). `aria-live="polite"`. |
| Order progress | `.progress` (OrderView) | 4 steps. Done is green with a check, current is tint with a ring and `aria-current="step"`, and the step state is also in hidden text. |
| Copy row | `CopyRow` (OrderView) | Label, large value (LTR, tabular), hint, and a tinted Copy button. Amounts copy as digits only, so they paste into bank apps. |
| Receipt uploader | `.receipt-drop` / `.receipt-preview` | A dashed drop target (whole area is the label), then a preview with **Change**. `accept="image/*"` opens the camera or gallery. |
| Callout | `.callout-warning` | Orange tint, icon and text. Used for rejected receipts. |
| Deadline banner | `.deadline` | Tint banner: "held until 5:57 PM · 2h 14m left". |
| Status card | `.status-card` | Waiting, expired and similar states: icon, title, one paragraph, one action. |
| Empty state | `EmptyState.tsx` | Icon in a circle, title, one sentence, one action. |
| Skeleton | `.skeleton` | Shimmer placeholder the size of the real content. |

## Anti‑patterns (don't)

- Raw hex in components, or colour as the only signal.
- `#007AFF` as text colour on white (fails AA). Use `--tint-text`.
- Emoji as icons, mixed icon styles, or filled and outline icons at the same level.
- Confirmation dialogs for reversible actions. Use Undo.
- Placeholder‑only labels, or validating on every keystroke.
- Animating width, height or top. Decorative motion. Ignoring reduced motion.
- `left`/`right`/`margin-left` in new CSS. Use logical properties so RTL keeps working.
- Real brand names or logos without a licence.

## Arabic & RTL

- `<html lang="ar" dir="rtl">` comes from the route (`/ar`). All CSS uses logical properties, and directional icons use `.flip-rtl`.
- **No letter‑spacing in Arabic.** Tracking breaks letter joining. `html[lang="ar"]` resets it on everything except `.code-value`/`.copy-value`.
- **Line height:** display styles (large title, hero, title1, section titles, big prices) use 1.35 in Arabic so diacritics aren't clipped.
- **Digits:** Western (`nu-latn`) everywhere, so prices and account numbers match banking apps and what people type.
- **Bidi:** wrap mixed‑direction values in `<bdi>` (references, percentages, amounts in sentences). Use `dir="auto"` where content may be either (copy rows), and `dir="ltr"` for codes, phone and transaction inputs.
- **Language switch:** shows the other language in its own script ("English" / "العربية"), with `lang` set on the label for screen readers.
