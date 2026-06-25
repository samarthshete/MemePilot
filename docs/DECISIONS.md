# DECISIONS.md — Architecture Decision Records (ADRs)

Why we built it this way. **Don't contradict an accepted ADR in code without proposing a new/superseding ADR here first.** Keep entries short.

Format: `ADR-NNN — Title` · Status · Date · Context · Decision · Consequences.

---

### ADR-001 — Next.js (App Router) + TypeScript + Tailwind, deploy on Vercel

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Need a fast, SEO-friendly site that can also run small server functions, with minimal ops for a scrappy MVP.
- **Decision:** Next.js App Router + TS (strict) + Tailwind. API routes act as our backend. Deploy on Vercel (free tier, push-to-deploy); Cloudflare for DNS/CDN.
- **Consequences:** One framework for front + thin back; no separate server to run. Edge/serverless caching available for the BirdEye proxy.

### ADR-002 — Privy for auth + non-custodial Solana embedded wallets

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Brand promise is "you own your crypto." Users hate seed phrases. Need Apple/Google login.
- **Decision:** Privy (`@privy-io/react-auth` + `/solana`) for Apple/Google/email login and auto-created non-custodial embedded Solana wallets; Privy signs transactions. (Privy is owned by Stripe.)
- **Consequences:** No seed-phrase onboarding; non-custodial keeps us out of key-custody/money-transmitter territory. Privy is a vendor dependency on the auth/signing path.

### ADR-003 — BirdEye for market data via server proxy + cache

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Need prices, trending, OHLCV, holders, trades without running an indexer. Free tier is **30K compute units/mo at ~1 req/s** — small.
- **Decision:** All BirdEye calls go through our `/api/*` routes (key server-side), aggressively cached. Price / token-list / OHLCV are on the free Standard pack; **holders / trending / tick-trades may require a paid tier** — if gated, fall back to DexScreener or Helius, or a short curated list, so the UI never breaks.
- **Consequences:** Caching is mandatory, not optional. Some research features may need a paid upgrade or a fallback source. Revisit if usage approaches the free cap.

### ADR-004 — TradingView Lightweight Charts for v1 (not the Advanced Charting Library)

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** The app's charts are simple green line/area charts. The TradingView Advanced Charting Library needs an application/approval + a self-hosted datafeed.
- **Decision:** Use the free, open-source **Lightweight Charts** library fed by BirdEye OHLCV for v1. Defer the Advanced (candlestick terminal) library to Phase 2.
- **Consequences:** Fast to integrate, matches the brand. Full candlestick/indicator terminal is a later project.

### ADR-005 — Jupiter managed swap flow for buy/sell

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Need best-price Solana swaps without building routing. Jupiter moved to a new Developer Platform (`dev.jup.ag`); free tier through the mid-2026 migration.
- **Decision:** Use Jupiter's managed flow (**quote → build/order → sign → execute**), transactions built server-side. Note the platform-fee param for later monetization; don't enable it yet.
- **Consequences:** Jupiter handles routing/slippage/landing. Set up billing on the new platform before the deadline. Exact endpoint names (Swap V2 / Ultra) to be confirmed against current docs at build time.

### ADR-006 — Alchemy RPC for sending tx + reading balances; public RPC for client reads

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Need a reliable way to send signed swaps and read balances. The Alchemy URL embeds a secret.
- **Decision:** Alchemy (keyed) Solana mainnet RPC server-side (`SOLANA_RPC_URL`) for send/confirm/balance. Privy's client config uses a **keyless/public** RPC (`NEXT_PUBLIC_SOLANA_RPC_URL`, e.g. `https://api.mainnet-beta.solana.com`) for low-rate client reads, so the Alchemy key never ships to the browser.
- **Consequences:** Keys stay safe; client reads are rate-limited but fine for MVP.
- **Update (2026-06-25):** Enforced the split after a keyed Alchemy URL was briefly placed in `NEXT_PUBLIC_SOLANA_RPC_URL` (it inlined into the client bundle). Now: `SOLANA_RPC_URL` (server, keyed) and `NEXT_PUBLIC_SOLANA_RPC_URL` (public, keyless) are distinct vars, and a **startup guard in `public-env.ts` throws** if the public var looks keyed (matches `alchemy`, `/v2/<key>`, or `?api-key=`) — failing the build rather than shipping the key. `.env.example` documents both. Rotate any key that was ever built/deployed with the public var.

### ADR-007 — Solana-only, non-custodial only; Non-Goals deferred

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Scope discipline for a scrappy MVP. The app has many features (launch, social, KOL, leaderboards, referrals, multi-chain).
- **Decision:** Build discovery + trading on Solana only, non-custodial only. Defer all Non-Goals (PLAN "Out of scope").
- **Consequences:** Smaller surface, faster launch. Those features return as separate, scoped projects later.

### ADR-008 — Landing page ships before the trading page

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** The landing page is the required deliverable (distribution); the trading page is an explicit bonus.
- **Decision:** Phase 1 = Stages 0–3 (landing + banner + auth) is independently shippable. Trading (Stages 4–6) follows.
- **Consequences:** A usable, deployable product exists at the end of Stage 3 even if trading slips.

### ADR-009 — No database until auth/trading; then Supabase

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** The landing page needs no persistence (cached proxy is enough).
- **Decision:** Ship landing-only with no DB. Introduce Supabase (Postgres) when login/trading lands, for `users`, `token_cache`, and later `trades`.
- **Consequences:** Less to operate early. Add the DB deliberately at Stage 3+.

### ADR-010 — All third-party keys server-side; client calls only our `/api` routes

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Exposed BirdEye/Alchemy/Jupiter keys = drained quota or fund risk.
- **Decision:** Secrets live only in server env. The browser only sees `NEXT_PUBLIC_*`. The client never calls BirdEye/Jupiter/RPC directly — always via our proxy routes.
- **Consequences:** A consistent proxy/validate/cache layer; safer keys; one place to add rate-limiting and fees.

### ADR-011 — Tailwind v4 (CSS-first config) on Next.js 16 + Turbopack

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** `create-next-app` now scaffolds **Next.js 16 / React 19 / Tailwind v4**. Tailwind v4 is CSS-first: there is **no `tailwind.config.js`** (CLAUDE.md's repo map and hard rule 7 say "tailwind.config"; that wording predates the v4 default). Next 16 builds with Turbopack, which infers a workspace root by walking up the filesystem.
- **Decision:** Keep the scaffold defaults. Define brand tokens in `src/app/globals.css` under `@theme` (e.g. `--color-cw-bg`), which generates utilities like `bg-cw-bg` / `text-cw-green` — the v4 equivalent of extending `theme.colors` in `tailwind.config`. Pin the Turbopack workspace root via `turbopack.root` in `next.config.ts` so the build doesn't traverse above the project. Added **zod** (required by hard rule 6) as the single new runtime dep.
- **Consequences:** "Brand tokens in `tailwind.config`" now means "brand tokens in `@theme`"; same effect, different file. No `tailwind.config.js` will exist — don't create one expecting it to be read. If we ever need JS-side config (plugins, complex theme logic), add `@config` or revisit.

### ADR-012 — Claude Design for UI design, Claude Code for implementation

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** We want fast, on-brand UI without a manual design-to-dev handoff.
- **Decision:** Design screens in Claude Design (ingesting our repo tokens + app screenshots), hand the bundle off natively to Claude Code, which implements the frontend code and all backend. Claude Code is the single source of truth for the codebase and enforces CLAUDE.md.
- **Consequences:** Design-led for Stages 1 and 4; tighter brand fidelity; one extra tool + usage to manage. The handoff is a visual spec, not an override of the architecture rules.

### ADR-013 — Stage 1 landing: extra surface tokens, glow utilities, placeholder assets

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** The locked landing design uses dark-navy shades and translucent neon greens beyond the 8 base brand tokens, plus colored "glow" shadows. Real brand assets (screenshots, logo SVG, store badges) are not in `public/brand/` yet. Tailwind v4's arbitrary `shadow-[…]` does not reliably combine with `shadow-<color>`.
- **Decision:** (1) Add two `@theme` tokens — `--color-cw-surface-2` (#040b1d, sunken bars: tickers/footer) and `--color-cw-bezel` (#161e34, phone frame). All other extra shades are expressed as opacity modifiers on existing tokens (`bg-cw-green/10`, `border-white/6`) — no raw hexes in components. (2) Express neon glows as `cw-glow-*` utility classes in globals.css using `color-mix(... var(--color-cw-green) ...)`, so glow color still traces to a token. (3) Ship on-brand CSS placeholders for phones/logo behind a one-prop/one-file swap seam (`PhoneMockup` `screenshot` prop, `Logo`); generate the OG image dynamically via `next/og` instead of committing a binary. (4) Scroll-reveal is DOM-driven (no React state) and fully gated by `prefers-reduced-motion`, so no-JS/reduced-motion users always see content.
- **Consequences:** Strictly on-brand with no stray hexes. Dropping real assets later is a localized change (no layout shift, dimensions already reserved). The OG card is real but generic until brand art exists. Raw hex literals remain only inside `opengraph-image.tsx` (satori requires literal styles) — acceptable, it is a generated image, not page UI.

### ADR-014 — Production hardening + deploy on Vercel, Cloudflare DNS

- Status: Accepted · Date: 2026-06-24
- Context: The landing page is the shippable Phase 1 asset and should be live and production-grade before more features land.
- Decision: Deploy on Vercel (push-to-deploy, preview-per-PR), Cloudflare for DNS (DNS-only/grey cloud initially; Full-strict SSL if later proxied). Harden in code: security headers + CSP, robots/sitemap, branded 404/500, /privacy + /terms stubs, Vercel Analytics on the download CTA. Secrets only in Vercel env; server vars never NEXT*PUBLIC*.
- Consequences: A live, monitored, crawlable, reasonably secure landing page; every future stage auto-deploys with a preview URL for review. Real legal copy + risk disclaimer still required before the Buy button (Stage 6).

### ADR-015 — CSP keeps `'unsafe-inline'` for script/style on the static landing page

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Next.js App Router injects inline bootstrap/hydration `<script>` and inline `<style>`; we also use a few inline `style` attributes (ticker duration var, reveal transition-delay). A strict nonce-based CSP needs middleware that sets a per-request nonce, which forces dynamic rendering and defeats static generation of the landing page.
- **Decision:** Ship an **enforced** CSP (not Report-Only) that locks down `default-src`/`object-src 'none'`/`frame-ancestors 'none'`/`base-uri 'self'`/`form-action 'self'`, allows only what we load (`'self'`, Vercel Analytics `va.vercel-scripts.com`, Google Fonts domains as belt-and-suspenders since next/font self-hosts, `img-src data: blob:`), and keeps `'unsafe-inline'` for `script-src` and `style-src`. Dev-only adds `'unsafe-eval'` + `ws:` for Turbopack HMR. `X-Frame-Options: DENY` backs up `frame-ancestors`.
- **Consequences:** A working, enforced CSP today without breaking SSG. Residual risk is script/style injection *if* an XSS bug existed — acceptable for a static, no-auth marketing page with no user input. Tightening path: when auth/trading lands (Stage 3+), add nonce middleware + `'strict-dynamic'` and drop `'unsafe-inline'` for scripts.
- **Update (2026-06-25, Stage 3 / Privy):** Added the minimal Privy directives per Privy's CSP guide (Solana-only, no WalletConnect): `script-src` += `https://challenges.cloudflare.com` (Turnstile); `connect-src` += `https://auth.privy.io https://*.rpc.privy.systems` + our Solana RPC origin(s) (http+ws); plus `frame-src 'self' https://auth.privy.io https://challenges.cloudflare.com`, `child-src 'self' https://auth.privy.io` (older-browser fallback), and `worker-src 'self' blob:` (Privy crypto workers). `'unsafe-inline'` still kept; nonce/strict-dynamic still deferred.

### ADR-016 — Product renamed ChadWallet → MemePilot

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** The product is rebranding from ChadWallet to MemePilot. The repo/remote is already `MemePilot`. The published mobile app store listings are still ChadWallet-branded.
- **Decision:** Rename all user-facing text, metadata (title/description/OG/Twitter/OG-image), legal pages, `package.json` name (`memepilot-web`), README, and docs to **MemePilot**; example domain `chadwallet.xyz` → `memepilot.xyz`. **Keep unchanged:** the store URLs / app identifiers (`id6757367474`, `xyz.chadwallet.www`) since they point to the real published app; the app screenshot images (they show the real app UI — only alt text was rebranded); the `cw-` `@theme` token prefix and `.cw-logo-mark` class (historical brand palette); `public/brand/logo-mark.svg` (placeholder mark, final MemePilot mark pending). Download CTAs use the neutral "Get the app" (never "Download MemePilot").
- **Consequences:** Web is MemePilot-branded now. Pending follow-ups: store-listing rename (links unchanged until then), final MemePilot logo mark, and an eventual `cw-`→`mp-` token rename if desired. The PRD (`ChadWallet-Web-PRD.md`) and the frozen design reference (`design/`) keep the old name as historical artifacts.

### ADR-017 — Free-tier ticker: curated mints via /defi/price, cached 60s (trending deferred)

- **Status:** Accepted · **Date:** 2026-06-24
- **Context:** Stage 2 needs real ticker prices on the BirdEye **free** plan. A live test showed `/defi/multi_price` and `/defi/token_trending` return **HTTP 401** ("lacks permission") on this plan; only `/defi/price` (single token) is available. The 24h change field is `priceChange24h` (a **percent** — confirmed: BONK at ~$4.2e-6 with change ~-4.2 can't be an absolute move).
- **Decision:** Ship a **curated list** of 8 verified Solana mints (`src/lib/ticker-tokens.ts`; each confirmed to return a price). On the free tier `getTickerPrices` **skips `/defi/multi_price`** (it 401s every window) and loops `/defi/price` directly — saving a wasted call + its latency. The batch path stays behind a `BIRDEYE_MULTI_PRICE` flag (env): set it `true` after upgrading and the one-call batch auto-activates (with loop fallback). Wrapped in `getOrSet` (**300s / 5-min TTL**) **with in-flight de-dup**, so concurrent callers and both ticker bars share one upstream fetch per window. On failure: serve last-good cached prices, else the static placeholder. Server-render via a `<Suspense>` boundary (skeleton fallback); the client refreshes from `/api/trending` every **5 min** and **pauses polling while the tab is hidden** (zero polls in a background tab; refetch once on return) so a single idle tab can't keep the cache warm 24/7. Defer real **trending discovery** until a paid plan or a fallback source (DexScreener/Helius) per ADR-003.
- **Consequences:** Real prices today on the free tier; the page (`/`) is now dynamic (live ticker in SSR). Per cold window it makes up to **8 `/defi/price` calls** (multi_price skipped), **once per 5 min**, not per visitor. **Honest worst case:** a tab kept continuously *focused* warms the cache every 5 min ≈ 288 windows/day × ~8 calls ≈ **~2,300 calls/day ≈ ~69K/month — which EXCEEDS the free 30K-CU/mo cap.** What keeps real burn low is that (a) tabs aren't focused 24/7 and the hidden-tab pause stops background polling, and (b) cold fetches only happen on a cache-miss request, so intermittent traffic costs far less. Continuous-warm *safety* (≤30K/mo) would need a **~12-min TTL**, `multi_price` (one call/window), or a paid plan. **Action:** watch BirdEye BDS Monitoring (CU usage) and raise the TTL to **10–15 min** if compute units climb. Switching to one batch call/window is automatic once `BIRDEYE_MULTI_PRICE=true` on an upgraded plan.

### ADR-018 — Privy auth: Solana-only embedded wallet, create-on-login

- **Status:** Accepted · **Date:** 2026-06-25
- **Context:** Stage 3 needs sign-in (Apple/Google/email) that yields a non-custodial Solana wallet with no seed phrase (ADR-002), while keeping the whole site publicly browsable (login only gates future buying). Installed `@privy-io/react-auth@3.x` (v3 dropped `@solana/web3.js` in favor of `@solana/kit`).
- **Decision:** `@privy-io/react-auth` `PrivyProvider` (client, `src/app/providers.tsx`) with `loginMethods: ['email','google']` (Apple deferred), `appearance: { theme: 'dark', accentColor: '#11FE9C' }`, and **only** a Solana embedded wallet: `embeddedWallets: { solana: { createOnLogin: 'users-without-wallets' } }` (no ethereum wallet → avoids the Solana-before-EVM ordering issue). Solana RPC configured via `solana.rpcs['solana:mainnet']` using `@solana/kit`'s `createSolanaRpc`/`createSolanaRpcSubscriptions` from `NEXT_PUBLIC_SOLANA_RPC_URL` (public RPC, ADR-006; falls back to public mainnet). Verified against the installed types: the Solana wallet comes from **`useWallets()` in `@privy-io/react-auth/solana`** (`wallets[0].address`), not `useSolanaWallets`. Nav `AuthButton` (client) uses `usePrivy()` → `!ready` placeholder / `Sign in` → `login()` / authenticated → truncated address + copy + `logout()`, with a "Setting up wallet…" state because the embedded wallet is created *after* login resolves. Server seam `GET /api/me` verifies the Bearer access token with `@privy-io/server-auth` `PrivyClient(appId, PRIVY_APP_SECRET).verifyAuthToken()` → `{ userId }` / 401; the secret never reaches the client. Degrades gracefully: missing `NEXT_PUBLIC_PRIVY_APP_ID` → render the public site with Sign-in disabled.
- **Consequences:** End of Stage 3 = **shippable Phase 1**. Browsing stays 100% public; login is opt-in. `/api/me` is the verification seam Stage 6 (trading) builds on. Pending: Apple login, and signing config (`solana.rpcs` already wired) exercised in Stage 6. CSP updated for Privy (see ADR-015 update).

### ADR-019 — Trading page shell + Lightweight Charts area chart via /api/ohlcv

- **Status:** Accepted · **Date:** 2026-06-25
- **Context:** Stage 4 = the `/t/[address]` trading page **shell + price chart only** (holders/live-trades are Stage 5; working buy/sell is Stage 6). Needed a chart data source on the BirdEye **free** tier.
- **Finding (free tier):** **`GET /defi/ohlcv` works on the free plan** (verified live: HTTP 200, real candles) — unlike `multi_price`/`token_trending` which 401. Params `address,type,time_from,time_to`; response `data.items[]` of `{o,h,l,c,v,unixTime}`. So the documented history_price fallback wasn't needed; a clean "Chart unavailable" empty state covers any runtime failure.
- **Decision:** Three-column responsive layout (stacks on mobile) reusing the cached `LiveTicker` + `/api/trending` for the left list and header price (`getTokenSummary` → `/defi/price`, any mint). Chart = **TradingView Lightweight Charts v5** `AreaSeries` of close prices (brand green, transparent bg, `ResizeObserver`, cleanup on unmount), fed by new `GET /api/ohlcv?address=&range=1D|1W|1M`. Ranges map to interval+window to keep candle counts low (1D→15m/24h≈96, 1W→1H/7d≈168, 1M→4H/30d≈180). Cached per `(address,range)` 180s via `lib/cache` (+ in-flight de-dup) → one upstream call/window; zod-validated; **retry-on-429** (free tier ~1 rps collides with the header price call). Buy/Sell is shell-only: button calls Privy `login()` when signed out, disabled "Trading coming soon" when signed in — **never** a swap path (hard rule 5). Ticker + left list link to `/t/<address>` (deferred from Stage 2).
- **Consequences:** Real read-only trading page on the free tier, no login required. Chart cost is one `/defi/ohlcv` call per `(address,range)` per 180s. Holders/Live-Trades tabs are visible placeholders ("coming soon"); buy/sell logic is Stage 6. Free-tier OHLCV usage adds to the 30K-CU/mo budget — same monitoring note as ADR-017.

### ADR-020 — Holders + Live Trades via BirdEye (free tier), visibility-gated trade polling

- **Status:** Accepted · **Date:** 2026-06-25
- **Finding (free tier):** All three needed endpoints **work on free** (verified live, HTTP 200): `GET /defi/v3/token/holder` (`data.items[]` `{owner, ui_amount}`), `GET /defi/v3/token/txs` (`data.items[]` `{side, volume_usd, owner, block_unix_time, tx_hash}`, newest-first with `sort_type=desc&tx_type=swap`), and `GET /defi/token_overview` (`totalSupply`/`circulatingSupply`, used to compute % of supply).
- **Decision:** `getTopHolders` (top 20 + % of supply) and `getRecentTrades` (recent swaps) in `birdeye.ts` — zod-validated, server-only, X-API-KEY + x-chain, **retry-on-429** (they stack on the ~1 rps free limit). Routes `GET /api/holders` (cache **300s** — slow-changing) and `GET /api/trades` (cache **45s** — fast); total supply cached **1h** separately so it doesn't add to the per-window holders cost (≈1 holder call/300s). Both always return 200 with a safe shape; gating/failure → `{ …: [], unavailable: true }` → clean "unavailable" empty state. Tabs (`TokenTabs`, client): Holders fetched once on first view (**never polled**); Live Trades fetched on activation then **polled every 45s only while that tab is active AND the page is visible** (reuses the Stage 2 hidden-tab pause). Read-only — no swap path.
- **Consequences:** Real holders (with % of supply) + live trades on the free tier. Upstream cost (verified): 1 holder call/300s + 1 overview/hour; 1 trades call/45s only while the Trades tab is open and visible (zero in a background/idle tab). Adds to the 30K-CU/mo budget — `/defi/token_overview` and `/defi/v3/token/txs` are heavier; revisit TTLs (ADR-017 monitoring note) if CU climbs.

### ADR-021 — Jupiter quote-only first (Stage 6a); execution deferred to 6b

- **Status:** Accepted · **Date:** 2026-06-25
- **Context:** De-risk the swap pipeline by shipping QUOTE-ONLY before any signing/sending. Jupiter moved to a Developer Platform; needed a keyless path for low-volume dev.
- **Finding (verified live):** **`GET https://lite-api.jup.ag/swap/v1/quote` works keyless** (HTTP 200); the legacy `quote-api.jup.ag/v6` host is dead (connection refused). Response: `{ inAmount, outAmount, otherAmountThreshold, slippageBps:number, priceImpactPct:string, routePlan[].swapInfo.label, swapUsdValue }`. **`priceImpactPct` is a FRACTION** (×100 = %; confirmed: 50k SOL → 0.872 = 87.2%). Amounts are raw strings → need token decimals (from `/defi/token_overview`) to display.
- **Decision:** `src/lib/jupiter.ts` (server-only) `getQuote()` — ExactIn, zod-validated, retry-on-429, 6s timeout; uses the keyless lite host by default, the pro host + `x-api-key` if server-only `JUPITER_API_KEY` is set. **No `/swap`, no transaction building, no signing** (hard rule 5). `POST /api/quote` { address, amountUsd, side, slippageBps? }: BUY converts USD→SOL lamports via BirdEye SOL price (cached 30s), quotes SOL→token, converts amounts with decimals (token_overview, cached 1h); cached **12s** per (address,amountUsd,slippage) → one Jupiter call/window; typed errors (`no_route`/`unavailable`/`sell_unavailable`), never crashes. SELL is deferred (no position to size from). Right panel re-quotes on amount/slippage change (400ms debounce) and previews pay/receive/impact/slippage/min-received/route; the action button only prompts `login()` (signed-out) or sits disabled "Review (coming soon)" (signed-in) — never signs/sends.
- **Consequences:** Quote/route/fees/slippage proven with zero money risk; quoting is read-only (no login). Client never sees the Jupiter host or any key (calls `/api/quote`). **Stage 6b** adds execution behind an explicit risk-disclaimer + confirm gate (quote → confirm → Privy sign → Alchemy send via server `SOLANA_RPC_URL`).

### ADR-022 — BUY execution: client signs (Privy), server relays (no keys, no signing)

- **Status:** Accepted · **Date:** 2026-06-25
- **Context:** Stage 6b executes a real on-chain BUY (SOL→token), mainnet, TINY amounts. The non-negotiable invariants: the user approves every signature, the server never signs/holds keys, a hard amount cap, an explicit review + first-trade risk gate.
- **Decision:** Pipeline = quote (6a) → **`POST /api/swap/build`** (server gets a fresh quote, calls Jupiter `…/swap/v1/swap` with the user's pubkey, returns base64 `swapTransaction`; **MAX_BUY_USD=$5 enforced server-side via zod**, not just UI) → client **signs in the Privy embedded wallet** via `useSignTransaction` from `@privy-io/react-auth/solana` (user approves; sign-only, not signAndSend) → **`POST /api/swap/send`** relays the *already-signed* bytes through the **server-only keyed `SOLANA_RPC_URL`** (`sendTransaction` + `getSignatureStatuses` poll, raw JSON-RPC) and confirms. The server NEVER signs, never holds a key, only forwards bytes. Review modal shows pay/receive/min-received/impact/slippage/network-fee/platform-fee($0) + the first-trade "I understand the risks" checkbox (persisted in localStorage). State machine: idle→quoting→building→review→signing→sending→success|error, every error recoverable, button disabled in-flight (no double-submit). Position = server `getTokenAccountsByOwner` valued at BirdEye price. **Fee-ready, fee OFF:** `buildSwapTransaction` accepts an optional `feeAccount`, omitted by default ($0); enabling needs `platformFeeBps` on the quote + a referral token account. **SELL deferred.** Jupiter quote schema parsed as `looseObject` (all levels) so `/swap` receives the complete, unmodified `quoteResponse` (stripping it → HTTP 422).
- **Consequences:** Real swaps possible with the user in control; server is a pure relay. Verified mechanically: `/api/swap/build` returns a real 817-byte VersionedTransaction; cap rejects >$5; junk send → typed error; no signing/keys in server code; no `JUPITER_API_KEY`/`SOLANA_RPC_URL` value/keyed host in the client bundle. **NOT yet executed on-chain by us** — requires a browser, a funded Privy wallet, and a user-approved signature (no auto-spend). **Blocker found:** the configured Alchemy `SOLANA_RPC_URL` key has an **origin/referrer allowlist** that rejects server-side calls ("Unspecified origin not on whitelist") — `/api/swap/send` and `/api/position` will fail until that key allows server (no-origin) use. Legal: `legal/legal-copy-DRAFT.md` was absent, so /terms (Part C), /risk (Part B), and the modal A1/A2 use clearly-marked DRAFT placeholders ([BRACKETS]) pending lawyer review.

---

## Proposed / open (not yet decided)

- Banner contents: general Solana trending vs. a curated featured set? (PRD open question #3)
- Shared identity with the mobile app's Privy, or separate web accounts? (PRD open question #4)
- BirdEye paid tier vs. free-only + fallback for holders/trades? (PRD open question #5)

> When one of these is decided, convert it into a numbered ADR above.
