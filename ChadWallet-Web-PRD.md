# ChadWallet Web — Product Requirements Document (PRD) & Technical Spec

**Version:** 1.0 (MVP)
**Author:** Product / Architecture
**Status:** Ready to build
**One-line:** A fomo.family-style **landing page** (must-have) + **web trading page** (bonus) for the **ChadWallet** Solana memecoin app, powered by real on-chain data.

---

## 0. What I analyzed before writing this (so you can trust the spec)

**Your 15 screenshots + the 25-second promo video (`chadwallet.mp4`)** are the App Store marketing set for the ChadWallet mobile app. The video is the animated version of the same screens (splash → launch coin → social feed → token/trading page → search → KOL live feed → portfolio → trader profile, with money-rain transitions). No new screens beyond the stills.

**What the app actually does (observed):**
- A **social-first Solana memecoin trading wallet** — essentially the same product category as fomo (the app you referenced). fomo.family is fomo's *web companion* to its mobile app, not a heavy trading terminal.
- Core features visible: buy/sell trending tokens, a live social feed (tabs: **Live / KOLs / Memecoin / Trending**), KOL ("key opinion leader") trade tracking (who bought/sold what), one-tap **memecoin launching** + **relaunching**, token detail pages with charts + holders + live trades, a portfolio/account screen (**Send / Receive / Deposit / Withdraw**, holdings, **Earn Rewards / referral**), MoonPay deposits, and trader profile pages (PnL chart, win rate, stats).

**The reference site (fomo.family) layout** is a dark, "space"-themed marketing page: a hero ("where traders become legends"), a feature grid (leaderboard, social feed, alerts, easy onboarding, multichain, Apple-Pay buy), and **Download App** CTAs. That is the template for the ChadWallet landing page.

**Brand colors I extracted directly from your screenshots** (use these as design tokens — see Appendix A):
- Primary / "Chad green" (buy + CTAs): **`#11FE9C`**
- Sell / negative / down: **`#FF4334`**
- App background (near-black navy): **`#020818`**
- Text: white `#FFFFFF`; splash is a black line-art "chad" face on a white background.

> **Note on your assets folder:** I derived the palette from the screenshots. Pull the actual logo files (SVG/PNG, light + dark variants) from your Google Drive folder before building so the wordmark is crisp. The folder link you gave is the source of truth for logo + icon.

---

## 1. Product Overview

**What it is**
A web presence for ChadWallet with two parts:
1. **Landing page (Phase 1 — required):** a marketing site that explains ChadWallet, shows the brand, drives **app downloads** (iOS + Android) and **web sign-ups**, and displays **live rotating token banners** at the top and bottom. Tapping any token in a banner opens the trading page.
2. **Web trading page (Phase 1.5 — bonus):** a desktop-friendly screen where a signed-in user can browse trending Solana tokens, view a token's chart / holders / live trades, and **buy & sell** — all with real data.

**Who it's for**
Retail crypto traders (mostly mobile-native, "degens") who chase early Solana memecoins and want a faster, friendlier way to find and trade them — plus people who currently only have the mobile app and want a bigger-screen experience.

**The core problem it solves**
Finding and trading early Solana tokens today means juggling DEX screeners, wallet extensions, seed phrases, and several websites. It's intimidating and slow. ChadWallet collapses *discover → research → buy/sell* into one branded, no-jargon flow with a familiar Apple/Google login and no seed-phrase setup.

**Why it should exist**
- The brand + mobile app already exist; the web needs a front door for **distribution** (App Store / Play downloads, SEO, paid-ad landing target).
- A web trading page lets users act on the big screen and gives ChadWallet a fomo-style "one identity, two platforms" story.
- It's cheap to launch: every service in the stack has a free tier.

---

## 2. User Personas

### Persona A — "Degen Dan" (primary)
- **Who:** 22, trades memecoins on his phone daily, lives on Crypto Twitter/X.
- **Goals:** Spot the next 100x before it's trending; buy in seconds; copy what top traders ("KOLs") do.
- **Pain points:** Misses launches; hates seed phrases and switching apps; gets rugged by scam tokens.
- **How ChadWallet helps:** Live trending banner + KOL feed surface tokens early; one-click buy via Jupiter; non-custodial embedded wallet means no seed phrase.

### Persona B — "Curious Chris" (secondary / top-of-funnel)
- **Who:** 30, heard about memecoins, never traded one, a little scared.
- **Goals:** Understand what this is; try it with $20 without getting scammed.
- **Pain points:** Crypto onboarding is confusing; doesn't know what a "wallet" is.
- **How ChadWallet helps:** Plain-language landing page; sign in with Apple/Google; deposit $20 via MoonPay; guided buy.

### Persona C — "Multi-screen Mia" (existing mobile user)
- **Who:** 27, already uses the ChadWallet app, wants to trade at her desk.
- **Goals:** Same account, same positions, bigger screen, faster charts.
- **Pain points:** Mobile is cramped for charting and reading holder data.
- **How ChadWallet helps:** Web trading page with the same Privy identity; desktop layout for chart + holders + trades.

---

## 3. Core User Flows

### Flow 1 — Landing → Download (the main Phase 1 conversion)
1. User lands on `chadwallet.xyz` (from an ad, X link, or search).
2. Sees the hero ("Find the next 100x memecoins here"), brand, and a **rotating token banner** (live trending tokens with price + % change) scrolling at the **top and bottom**.
3. Scrolls feature sections (trade fast, follow KOLs, launch coins, track assets).
4. Taps **Download** → routed to the App Store (iOS) or Google Play (Android), auto-detecting device.
   - **Value delivered:** they have the app / are in the funnel.

### Flow 2 — Landing → Tap a token → Trading page (connects Phase 1 to 1.5)
1. User taps a token in the top/bottom banner (e.g., "unc").
2. App routes to `/t/<tokenAddress>` (the trading page) for that token.
3. They see the token's chart, price, holders, and live trades **without needing to log in** (read-only).
4. To buy, they're prompted to **sign in** (Privy).
   - **Value delivered:** instant research; a clear, low-friction path to their first trade.

### Flow 3 — Sign in → Buy → See position (the Phase 1.5 payoff)
1. User clicks **Sign in** → Privy modal → chooses **Apple** or **Google** (or email).
2. Privy silently creates a **non-custodial embedded Solana wallet** (no seed phrase).
3. User has $0 → prompted to **Deposit** (MoonPay/Apple Pay, or send SOL to their address).
4. On a token page, right panel: enter amount (e.g., $20) → **Buy**.
5. Behind the scenes: Jupiter returns a quote → builds the swap transaction → Privy signs it → it's sent to Solana via the Alchemy RPC → confirmation.
6. Right panel now shows **Your position** (quantity, value, PnL).
   - **Value delivered:** they own a token they discovered, end-to-end, in one place.

---

## 4. MVP Feature List (Phase 1)

Legend: ✅ = in scope for first launch · 🟡 = bonus / Phase 1.5 · ❌ = out of scope (see Non-Goals).

### Landing page (Phase 1 — the minimum to ship) ✅
| Feature | In? | Why it matters |
|---|---|---|
| Dark, brand-accurate hero (logo, headline, sub-copy) | ✅ | First impression + brand; mirrors fomo.family's hero. |
| **Download buttons** (App Store + Google Play, device auto-detect) | ✅ | This is the #1 job of the page — distribution. Use your real store links. |
| **Rotating live token banner — top & bottom** | ✅ | Explicitly requested. Real trending tokens + price/% from BirdEye. Proves the product is "live." |
| **Tap token in banner → opens trading page** (`/t/<address>`) | ✅ | Requested. If trading page isn't live yet, fall back to a minimal token page or external chart (graceful). |
| Feature sections (fast trading, KOLs, launch coins, track assets) | ✅ | Communicates value; reuse your screenshots as section imagery. |
| **Sign in with Apple / Google (Privy)** | ✅ | Requested. Needed to reach trading; non-custodial wallet auto-created. |
| Responsive (looks right on phone + desktop) | ✅ | Most traffic is mobile. |
| Footer (socials, privacy, terms) + basic SEO/OG tags | ✅ | Credibility + shareable link previews. |

### Web trading page (Phase 1.5 — bonus, skip if short on time) 🟡
| Feature | In? | Why it matters |
|---|---|---|
| **Left:** trending tokens list (click to load) | 🟡 | Discovery; matches your spec's left column. |
| **Middle:** token info + **price chart** + holders + **live trades** | 🟡 | The research core. Chart = Lightweight Charts fed by BirdEye OHLCV. |
| **Right:** **Buy & Sell** + user's position | 🟡 | The money-maker. Jupiter swap + Privy signing. |
| Read-only browsing without login | 🟡 | Lowers friction; login only gates buying. |

### Out of scope for Phase 1 ❌
Coin launching/relaunching, KOL copy-trading, social feed, leaderboards, referral/rewards system, MoonPay deposit UI (link out instead), multi-chain (Base/BNB/etc.), notifications, candlestick TradingView terminal. (See Non-Goals.)

---

## 5. Non-Goals (don't build these yet)

- ❌ **Coin launch / relaunch flow.** It's visually central in the app, but it's a heavy on-chain + storage feature (image upload, metadata, bonding curve). Ship discovery + trading first.
- ❌ **Social feed, KOL tracking, leaderboards, referrals/rewards.** Each is its own data pipeline. They make the *app* special but aren't needed to validate the *web*.
- ❌ **Multi-chain.** You asked for Solana only. Don't add Base/BNB/Monad now — it multiplies RPC, routing, and balance complexity.
- ❌ **Custodial wallets or holding user keys.** Let Privy keep wallets non-custodial. It matches your brand promise ("you own your crypto, safe and untouchable") and keeps you out of money-transmitter territory.
- ❌ **A full TradingView candlestick terminal.** The app's charts are simple green line/area charts. Use the free Lightweight Charts library now; the TradingView Advanced Charting Library needs an approval process and a self-hosted datafeed — that's Phase 2.
- ❌ **Your own price/indexer infrastructure.** Don't run your own Solana indexer. Use BirdEye for market data; you'll add caching, not a data warehouse.

**Common traps to avoid**
1. **Putting API keys in the browser.** BirdEye/Alchemy/Jupiter keys must live on the server (a Next.js API route proxies them). Exposed keys = drained quota or worse.
2. **Hammering BirdEye's free tier.** It's **30,000 compute units/month at ~1 request/second**. Without caching, a live banner alone will blow through it. Cache aggressively (see §6).
3. **Trusting any token is safe.** Memecoins rug. Don't imply safety; show data, add a "trade at your own risk" disclaimer.
4. **Over-building the trading page before the landing page ships.** Landing page is the contract; trading page is the bonus.

---

## 6. Technical Approach (explained simply)

Think of it as three layers: a **website** people see, a thin **server** that fetches data and keeps secrets safe, and **outside services** that do the heavy lifting (login, prices, swaps).

### Frontend (what the user sees) — **Next.js + Tailwind CSS**
- **Next.js** = a popular React framework for building fast websites; it can also run small bits of server code ("API routes"), so you don't need a separate backend server for the MVP.
- **Tailwind CSS** = utility styling so you can match the dark/green brand quickly.
- **Deploy on Vercel** (made by the Next.js team; generous free tier; push-to-deploy from GitHub). Cloudflare is your DNS + CDN + caching layer in front (also free).
- Build the landing page first as static/SSR pages; the trading page is a dynamic page at `/t/[address]`.

### Backend (the thin server in the middle) — **Next.js API routes (serverless) on Vercel**
- You do **not** need a standalone backend for the MVP. Next.js "API routes" run as serverless functions and are enough.
- Their jobs:
  1. **Proxy + cache** market data so your BirdEye/Alchemy keys never reach the browser and you respect rate limits.
  2. **Build swap transactions** by calling Jupiter (keeps logic server-side, lets you add a platform fee later).
  3. **Verify the Privy login token** on requests that touch a user.
- **Caching is the whole game on the free tier:** cache trending/banner data for ~30–60s and token detail for ~10–15s using Vercel's edge cache and/or a tiny Supabase/Cloudflare KV table. One BirdEye call serves thousands of visitors.

### Database — **Supabase (hosted Postgres)**
- **Supabase** = a hosted Postgres database with a friendly dashboard, auth-ready APIs, and a free tier.
- **For the landing-page-only MVP you may not need a DB at all** — a cached BirdEye proxy is enough. Add Supabase the moment you introduce login/trading, to store users, a token cache, and (later) trade history.

### Outside services (the heavy lifting)
| Service | What it does in plain terms | Free tier note |
|---|---|---|
| **Privy** | "Sign in with Apple/Google," then auto-creates a **non-custodial Solana wallet** for the user (no seed phrase). It signs transactions. | Free dev tier; React SDK `@privy-io/react-auth` (+ `/solana`). *(Privy is now owned by Stripe.)* |
| **BirdEye** | Token prices, trending lists, candlestick (OHLCV) chart data, top holders, recent trades. Powers the banner, the trending list, and the chart. | Free: **30K compute units/mo, ~1 req/s**. Price/Token-List/OHLCV are in the free Standard pack; **holders / trending / tick trades may need a paid tier** — plan a fallback (e.g., DexScreener/Helius) or upgrade. |
| **Alchemy RPC** | The "phone line" to the Solana network — used to send the signed buy/sell transaction and read wallet balances. | Free tier is plenty for MVP. |
| **Jupiter** | The swap engine. You ask "swap X SOL for token Y," it finds the best route across DEXes and returns a ready-to-sign transaction. | Free tier on the new Jupiter Developer Platform (`dev.jup.ag`); managed flow is **quote → build/order → sign → execute**. Set up billing before the mid-2026 migration deadline. |
| **TradingView Lightweight Charts** | A free, open-source charting library for the price chart. (The fancier TradingView "Advanced Charting Library" needs application + a self-hosted datafeed — Phase 2 only.) | Free, MIT-style license; no approval needed. |
| **MoonPay** (deposits) | Buy crypto with card/Apple Pay. For MVP, **link out** to it rather than embedding. | — |

### AI tools (optional accelerant)
Use AI coding tools (e.g., Cursor / Claude Code) to scaffold the Next.js + Tailwind UI from your screenshots and this spec. Keep AI in the build loop, **not** in the product for Phase 1 (no AI features needed to launch).

### How a "Buy" actually travels through the system (so the engineer sees the wiring)
```
User clicks Buy ($20 of TOKEN)
  → your API route calls Jupiter: "quote SOL→TOKEN for $20"
  → Jupiter returns a built (unsigned) transaction
  → Privy embedded wallet signs it (user approves)
  → signed tx sent to Solana via Alchemy RPC
  → confirmation → refresh balance/position via BirdEye/RPC
```

---

## 7. Data Model (high level)

For the **landing page only**, you can launch with **no database** (just a cached proxy). Introduce these tables when you add login + trading:

- **users**
  - `id` (Privy user ID / DID), `wallet_address` (Solana), `handle` (optional), `created_at`
- **token_cache** (powers banner, trending list, token pages — refreshed on a schedule)
  - `address`, `symbol`, `name`, `logo_url`, `price_usd`, `price_change_24h`, `market_cap`, `volume_24h`, `updated_at`
- **watchlist** (optional, simple personalization)
  - `user_id`, `token_address`, `created_at`
- **trades** (optional, for history/PnL later)
  - `id`, `user_id`, `token_address`, `side` (buy/sell), `amount_usd`, `token_qty`, `tx_signature`, `status`, `created_at`
- **referrals / rewards** (later — out of scope now)

Keep it this small. Most "data" is fetched live from BirdEye/Jupiter and cached, not stored.

---

## 8. Success Metrics

Pick 3–5 and instrument them from day one (use Vercel Analytics or PostHog free tier):

1. **App download click-through rate** — % of landing visitors who tap App Store/Play. *(Primary goal of Phase 1.)*
2. **Sign-in conversion** — % of visitors who complete Privy login (Apple/Google).
3. **Banner engagement** — % of sessions that click a token in the rotating banner → trading page.
4. **(Trading page) First-trade rate** — % of signed-in users who complete a buy. *(Phase 1.5.)*
5. **Performance / reliability** — landing LCP < 2.5s; BirdEye monthly compute-unit usage stays under the free cap (a proxy for "caching is working").

---

## 9. Build Plan (step-by-step order)

**Stage 0 — Setup (½ day)**
- Create GitHub repo; `npx create-next-app` (App Router) + Tailwind; deploy a "hello world" to Vercel; point Cloudflare DNS at it.
- Get API keys: Privy app ID, BirdEye key, Alchemy Solana key, Jupiter key. Store as Vercel env vars (server-side only).
- Pull real logo/brand files from the Drive folder; set the design tokens from Appendix A.

**Stage 1 — Landing page, static (1–2 days)** ✅ *ship-able*
- Hero (logo, headline, sub-copy), feature sections (reuse screenshots), footer, SEO/OG tags.
- **Download buttons** with device detection → your real App Store / Play links.
- Responsive pass (mobile + desktop).

**Stage 2 — Live token banner (1 day)** ✅
- Server API route: `GET /api/trending` → calls BirdEye trending/token-list, **caches 30–60s**, returns a clean list.
- Build the top + bottom marquee/ticker (symbol, logo, price, % change, green/red).
- Each item links to `/t/<address>` (graceful fallback to an external chart if the trading page isn't built yet).

**Stage 3 — Auth (½–1 day)** ✅
- Add Privy provider; "Sign in with Apple/Google" button; confirm a non-custodial Solana wallet is created on login; show the wallet address.

> **🎯 At the end of Stage 3 you have a complete, launchable Phase 1.** Everything below is the bonus.

**Stage 4 — Trading page shell (1–2 days)** 🟡
- Three-column layout at `/t/[address]`. Left: trending list (reuse `/api/trending`). Middle: token header + price + **Lightweight Charts** fed by `GET /api/ohlcv?address=…` (BirdEye OHLCV, cached). Right: empty buy/sell panel.

**Stage 5 — Holders + live trades (1 day)** 🟡
- API routes for top holders + recent trades (BirdEye; if not on free tier, wire a fallback or upgrade). Render in the middle column. Poll every ~10–15s (cached) — keep it simple, no websockets yet.

**Stage 6 — Buy & Sell (2–3 days)** 🟡 *highest risk; do last*
- `POST /api/swap/quote` and `/api/swap/build` (Jupiter) → Privy signs → send via Alchemy → confirm.
- Show **Your position** (qty, value, PnL) from balance + BirdEye price.
- **Test with tiny amounts on mainnet** (memecoin liquidity is mainnet-only). Add slippage setting + a clear risk disclaimer.

**What you can safely skip initially:** websocket live prices (poll instead), trade history persistence, watchlist, MoonPay embed (link out), candlestick/TradingView terminal, anything in Non-Goals.

---

## 10. Questions & Assumptions

### Assumptions I'm making
1. **Domain/brand:** "ChadWallet" web lives on a domain like `chadwallet.xyz`; final logo/wordmark comes from your Drive folder. Palette per Appendix A.
2. **Solana only**, non-custodial via Privy embedded wallets — matching the app's "you own your crypto" promise.
3. **Landing page is the real deliverable; trading page is genuinely optional** for v1 (you said so).
4. **"Token banner tap → trading page"** means routing to a per-token page; if the trading page isn't built yet, it degrades gracefully (minimal token view or external chart link).
5. **Charts are simple line/area** (matching the app), so Lightweight Charts is fine for v1.
6. **Real data from day one** via BirdEye + Jupiter + Alchemy, with server-side caching to live within free tiers.
7. A **small platform fee** on swaps (like the app charges) may be desired later; Jupiter supports a platform fee param — note it, don't build it yet.

### Questions to confirm before/while building
1. **Trading page in v1, yes/no?** If launch is in <1 week, recommend landing-only first, trading the week after.
2. **Login on landing — required or optional?** I assumed optional (browse freely; login only to buy). Confirm.
3. **Which tokens in the banner?** "Trending on Solana" generally, or a hand-picked/featured set you control? (Affects which BirdEye endpoint + whether you need a curated list table.)
4. **Same accounts as the mobile app?** Is the app already on Privy? If yes, web can share the exact same identity. If not, web accounts are separate for now.
5. **Do you have BirdEye usage budget** beyond free tier? Holders/trending/tick-trades may need a paid plan — okay to upgrade, or should I design around free-only endpoints + a fallback?
6. **Deposits:** link out to MoonPay for v1 (recommended), or must the deposit flow be embedded?
7. **Legal/compliance:** Do you have Terms / Privacy / a risk disclaimer ready? A trading product needs them before the buy button goes live.
8. **Region/availability:** Any geo-restrictions (some jurisdictions block crypto swaps/MoonPay)?

---

## Appendix A — Brand & Design Tokens (extracted from your screenshots)

```css
/* Core palette */
--cw-bg:            #020818;  /* app background, near-black navy */
--cw-surface:       #0A1122;  /* cards / elevated panels (approx; tune to taste) */
--cw-green:         #11FE9C;  /* PRIMARY: buy buttons, CTAs, positive % */
--cw-green-press:   #10E48C;  /* pressed/hover state */
--cw-red:           #FF4334;  /* sell, negative %, down */
--cw-text:          #FFFFFF;  /* primary text */
--cw-text-muted:    #8A93A6;  /* secondary text (approx) */
--cw-splash-bg:     #FFFFFF;  /* splash screen background */
--cw-splash-logo:   #000000;  /* black "chad" line-art logo on splash */
```
- **Logo:** black line-art "chad" head + "ChadWallet" wordmark on white (splash). On the dark app UI you'll want a **white or green** logo variant — grab both from the Drive folder.
- **Buttons:** full-width pill, green fill, black/dark text (buy); red fill for sell.
- **Vibe:** dark, high-contrast, bright-green accents, big bold price numerals.

## Appendix B — Key links & API cheat-sheet

**Your store links (use on Download buttons):**
- Android (Play): `https://play.google.com/store/apps/details?id=xyz.chadwallet.www`
- iOS (App Store): `https://apps.apple.com/us/app/chadwallet/id6757367474`
- Brand assets (Drive): your shared folder (pull logo + icon + screenshots).

**Service docs:**
- Privy (auth + Solana embedded wallets): `https://docs.privy.io`
- BirdEye Data Services (prices/OHLCV/holders/trades): `https://docs.birdeye.so` — for-AI index at `docs.birdeye.so/llms.txt`
- Alchemy Solana RPC: `https://www.alchemy.com/rpc-api`
- Jupiter (swaps): `https://dev.jup.ag`
- TradingView Lightweight Charts (free): `tradingview.github.io/lightweight-charts`

**Reference layout to mirror for the landing page:** fomo.family (dark "space" hero → feature grid → download CTAs → footer).

## Appendix C — Trading page layout (text wireframe)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ░░ rotating token banner (live, clickable) ░░                         │
├───────────────┬──────────────────────────────────┬────────────────────┤
│ LEFT          │ MIDDLE                            │ RIGHT              │
│ Trending list │ Token header: logo, name, $price, │ [ Buy ] [ Sell ]   │
│ • unc  +50%   │ % change, contract chip           │ Amount: $[ 20 ]    │
│ • PEEPA -48%  │ ── price chart (Lightweight) ──    │ presets $10/$50/.. │
│ • ASAT +434%  │ Tabs: Holders | Live Trades        │ ─────────────────  │
│ • ...         │  Holders: top wallets %            │ Your position:     │
│ (click=load)  │  Trades: who bought/sold, when     │  qty / value / PnL │
└───────────────┴──────────────────────────────────┴────────────────────┘
        (read-only until "Buy" → Privy sign-in prompt)
```

---

### TL;DR for the engineer
Build the **Next.js + Tailwind landing page on Vercel** first: brand hero, real **download buttons**, a **live BirdEye-powered token ticker** top & bottom (cached server-side), **Privy Apple/Google sign-in** creating a non-custodial Solana wallet. That's a shippable Phase 1. Then add the **three-column trading page** (`/t/[address]`): trending list (left), chart + holders + trades via BirdEye (middle), and **Jupiter buy/sell** signed by Privy and sent via Alchemy (right). Keep keys server-side, cache everything, Solana-only, no seed phrases, ship the landing page before the trading page.
