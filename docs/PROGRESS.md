# PROGRESS.md — MemePilot Web status

**Keep this current.** At the end of every stage, check off tasks, set the status, and add a session-log row.

**Current focus:** Stage 6c 🟦 — SELL execution built (position-sized, client-sign + server-relay); live test pending (same blockers as 6b)
**Last updated:** 2026-06-25 (Stage 6c: position-based sell sizing, token→SOL build/quote, server balance+cap validation; build-complete, not live-verified)
**Live URL:** _not deployed_
**Active branch:** `main`

Status key: ⬜ not started · 🟦 in progress · ✅ done · ⛔ blocked

---

## Phase 1 — Landing (shippable)
- ✅ **Stage 0 — Scaffold & guardrails**
  - ✅ create-next-app (App Router, TS, Tailwind, ESLint, src/, `@/*`); docs moved to `docs/`; `.env.example` added
  - ✅ `typecheck` script + strict TS (strict already on)
  - ✅ brand tokens in `globals.css` `@theme` (Tailwind v4) + dark base layout; minimal on-brand placeholder page
  - ✅ `lib/env.ts` (zod, server/public split), `lib/cache.ts` (TTL), `/api/health` → `{ ok: true }`
  - ✅ typecheck + lint + build green; `/api/health` verified 200
- ✅ **Stage 1 — Landing page (static)**
  - ✅ top/bottom live ticker (static placeholder, pure-CSS marquee, pause-on-hover), header, hero (phone-led, LCP), 4 feature rows, trust strip, final CTA, footer
  - ✅ download buttons (client device-detect → store routing) · Archivo + Space Mono via next/font · scroll-reveal (reduced-motion safe)
  - ✅ SEO/OG (metadata + dynamic next/og opengraph-image) · brand-only via @theme tokens (added cw-surface-2, cw-bezel) · responsive (360/768/1440)
  - ✅ real app screenshots wired (hero + 4 features) via next/image static imports; ✅ real logo mark wired (logo-mark.svg via CSS mask, recolors with currentColor); ⚠️ store badges still on-brand placeholders (no official badge SVGs yet)
  - ✅ store URLs flow from NEXT_PUBLIC_APP_STORE_URL / NEXT_PUBLIC_PLAY_STORE_URL (no more "#" fallback when .env.local is set)
  - ✅ typecheck + lint + build green; page/OG/health verified 200
- ✅ **Stage 2 — Live token banner**
  - ✅ `/api/trending` → `lib/birdeye.ts` (server-only, zod) + `lib/ticker-tokens.ts` (curated 8 mints), cached 60s with in-flight de-dup + last-good/placeholder fallback
  - ✅ top + bottom marquee show REAL prices (SSR via Suspense skeleton, client refresh 60s); free-tier `/defi/price` fallback (multi_price 401-gated). ADR-017
  - ⬜ items link to `/t/<address>` — deferred to Stage 4 (trading page not built yet)
  - ✅ verified: real green/red prices, ONE upstream fetch per 60s window, no key/BirdEye URL in client bundle, fallback renders when BirdEye down
- ✅ **Stage 3 — Auth (Privy)** — 🎯 completes shippable Phase 1
  - ✅ `providers.tsx` PrivyProvider (email + Google; Apple deferred), Solana-only embedded wallet `createOnLogin: users-without-wallets`, dark/#11FE9C modal, `solana.rpcs` via @solana/kit
  - ✅ nav `AuthButton`: !ready placeholder → Sign in → truncated Solana address + copy + logout (with "Setting up wallet…" guard)
  - ✅ `GET /api/me` verifies Bearer access token (`@privy-io/server-auth`) → `{ userId }` / 401; secret server-only
  - ✅ CSP updated for Privy (ADR-015 update); browsing stays 100% public; ADR-018
  - ⬜ 🎯 deploy Phase 1 to Vercel + Cloudflare DNS

## Phase 1.5 — Trading (bonus)
- ✅ **Stage 4 — Trading page shell + chart** (`/t/[address]`, Lightweight Charts, `/api/ohlcv`)
  - ✅ 3-col responsive layout (LiveTicker + left trending list / token header+chart+placeholder tabs / buy-sell shell); ticker + list link to `/t/<address>`
  - ✅ `/api/ohlcv?address=&range=1D|1W|1M` → **`/defi/ohlcv` works on FREE tier** (15m/1H/4H), cached 180s/(addr,range) + retry-on-429, zod; area chart (Lightweight Charts v5), graceful "Chart unavailable"
  - ✅ buy/sell SHELL only: login when signed out / disabled "Trading coming soon" signed in — no swap path; read-only without login; ADR-019
  - ✅ verified real price+chart, 1 upstream call/(addr,range) window, no key/BirdEye URL in client bundle
- ✅ **Stage 5 — Holders + live trades** (`/api/holders`, `/api/trades`, tabs, polling)
  - ✅ free-tier endpoints (verified): `/defi/v3/token/holder`, `/defi/v3/token/txs`, `/defi/token_overview` (for % of supply) — all HTTP 200 free
  - ✅ Holders tab: top 20 wallets — rank, copyable address, % of supply + amount (fetched once, never polled)
  - ✅ Live Trades tab: recent swaps — side (buy/sell), USD, relative time, wallet (newest first); polls 45s ONLY when tab active + page visible
  - ✅ caches: holders 300s, trades 45s, supply 1h; graceful "unavailable" empty state if gated; read-only (no swap). ADR-020
  - ✅ verified: real data, 1 upstream call per window (holders/trades), no key/BirdEye URL in client bundle
- 🟦 **Stage 6 — Buy & Sell** (Jupiter quote/build → Privy sign → Alchemy send → position)
  - ✅ **6a quote-only**: `src/lib/jupiter.ts` + `POST /api/quote` (Jupiter `lite-api.jup.ag/swap/v1/quote`, keyless free; pro host if `JUPITER_API_KEY`), USD→SOL via BirdEye, decimals via token_overview, cached 12s + retry; right-panel quote preview (pay/receive/impact/slippage/min-received/route) debounced on amount+slippage. NO swap/sign/send. ADR-021
  - 🟦 **6b buy execution — BUILD-COMPLETE, NOT LIVE-VERIFIED (no on-chain test tx yet)**: `POST /api/swap/build` (Jupiter swap-build, MAX_BUY_USD=$5 server-enforced) → client signs in Privy (`useSignTransaction`, user approves) → `POST /api/swap/send` relays signed bytes via server-only `SOLANA_RPC_URL` + confirms → position via `getTokenAccountsByOwner`. Review modal (amounts + first-trade risk checkbox), /risk + /terms legal mechanism (DRAFT copy), fee-ready/$0, SELL deferred. ADR-022
    - ✅ verified mechanically: build returns a real signable tx; cap enforced server-side; server never signs/holds keys; no key/host in client bundle
    - ⏳ **to verify later:** fund a Privy wallet, run a ~$1 SOL→USDC buy, confirm the tx signature + position update — then flip this to ✅
    - ⚠️ pre-live blockers: Alchemy `SOLANA_RPC_URL` key has an origin allowlist that rejects server calls (fix in Alchemy dashboard); + needs a funded wallet + browser signature (not run by tooling)
  - 🟦 **6c sell execution — BUILD-COMPLETE, NOT LIVE-VERIFIED (same as 6b)**: position-sized (server balance read → raw+decimals), %-presets 25/50/Max + exact input (BigInt, capped at balance), token→SOL quote, `/api/swap/build` validates `amount ≤ balance` + caps USD proceeds (`MAX_SELL_USD=$5`) server-side; reuses 6b sign/relay + side-aware ReviewModal; fee-ready/$0. ADR-023
    - ✅ verified: sell build returns a real 539-byte tx; amount_capped + exceeds_balance typed; signing client-only; no secrets in client bundle; edge cases (0 balance/dust/Max/no-route/balance-fail) handled
    - ⏳ to verify later: fund a wallet + lift the Alchemy origin allowlist, then run a tiny real sell and confirm signature + position decreases

---

## Open questions blocking nothing yet (track answers here)
- [ ] Trading page in v1 or fast-follow?
- [ ] Login required on landing or optional? (assumed optional)
- [ ] Banner: general trending vs curated set?
- [ ] Same Privy identity as the mobile app?
- [ ] BirdEye paid tier available, or design free-only + fallback?
- [ ] Terms / Privacy / risk disclaimer ready before the Buy button?

---

## Session log
| Date | Stage | What changed | Branch / commit |
|------|-------|--------------|-----------------|
| 2026-06-24 | — | Created CLAUDE.md, PLAN, DECISIONS, PROGRESS, PROMPTS, .env.example, review-gate skill | — |
| 2026-06-24 | 0 | Scaffolded Next.js 16 / React 19 / TS strict / Tailwind v4; brand tokens + dark base; `lib/env.ts` (zod) + `lib/cache.ts`; `/api/health`; `.env.example`; `public/brand/README.md`. Docs moved to `docs/`. ADR-011 added. | `stage-0-wiring` |
| 2026-06-24 | docs | Aligned docs to Tailwind v4; added Claude Design workflow (ADR-012, DESIGN-WORKFLOW.md, design/) | `stage-0-wiring` |
| 2026-06-24 | 1 | Landing page: ticker/header/hero/features/trust/final-CTA/footer in src/components/landing/; next/font, scroll-reveal, dynamic OG; ADR-013 (tokens + glow approach). Brand assets still placeholder. | `stage-1-landing` |
| 2026-06-24 | 1 | Wired real logo mark (public/brand/logo-mark.svg via CSS mask in Logo.tsx, header+footer) + confirmed store URLs flow from NEXT_PUBLIC_* (no "#" fallback). | `stage-1-landing` |
| 2026-06-24 | 1 | Production hardening: security headers + enforced CSP (next.config), robots.ts/sitemap.ts (noindex off-prod), /privacy + /terms stubs (footer wired), branded 404 + 500, @vercel/analytics + download_click event, DEPLOYMENT.md in source-of-truth. ADR-015 (CSP). Verified headers/robots/sitemap, no secret leak. | `stage-1-landing` |
| 2026-06-24 | — | Rebrand product ChadWallet → MemePilot (UI text, metadata, OG image, legal pages, package name `memepilot-web`, README + docs, domain → memepilot.xyz). Store URLs/app IDs, screenshots, `cw-` tokens, logo-mark placeholder kept. Download CTAs → "Get the app". ADR-016. | `main` |
| 2026-06-25 | 3 | Privy auth: providers.tsx PrivyProvider (email+Google, Solana-only embedded wallet create-on-login, @solana/kit RPC), nav AuthButton (address+copy+logout), GET /api/me Bearer verify, CSP +Privy. No secret in client bundle; public browsing intact. ADR-018 + ADR-015 update. Completes Phase 1. | `main` |
| 2026-06-25 | 4 | Trading page /t/[address]: 3-col shell (trending list / header+chart+placeholder tabs / buy-sell shell), Lightweight Charts area chart via /api/ohlcv (free-tier /defi/ohlcv, cached 180s + retry), ticker/list link to /t/. Buy=login-or-disabled (no swap). ADR-019. | `main` |
| 2026-06-25 | 5 | Holders + Live Trades tabs: /api/holders (300s) + /api/trades (45s) via free-tier /defi/v3/token/{holder,txs} + token_overview (% of supply, supply cached 1h); trades poll 45s only when tab active+visible; graceful gating fallback; read-only. ADR-020. | `main` |
| 2026-06-25 | 6a | Jupiter QUOTE-ONLY: src/lib/jupiter.ts + POST /api/quote (keyless lite-api.jup.ag/swap/v1/quote; USD→SOL via BirdEye, decimals via token_overview; cached 12s + retry); right-panel preview (receive/impact/slippage/min-received/route) debounced. No swap/sign/send; quoting read-only. ADR-021. | `main` |
| 2026-06-25 | 6b | BUY execution: jupiter.buildSwapTransaction + /api/swap/{build,send} + /api/position + solana.ts relay (raw JSON-RPC, server never signs); ReviewModal (Privy useSignTransaction, risk checkbox), MAX_BUY_USD=$5 server-enforced, /risk + /terms DRAFT legal, fee-ready/$0, SELL deferred. Build verified (real tx); on-chain test pending (Alchemy origin allowlist). +@solana-program/memo. ADR-022. | `main` |
| 2026-06-25 | 6c | SELL execution: position-sized (server balance read raw+decimals), %-presets 25/50/Max + exact input (BigInt capped), token→SOL quote/build, server validates amount≤balance + MAX_SELL_USD=$5 proceeds cap; side-aware ReviewModal reuses 6b sign/relay; fee-ready/$0. Build verified (539-byte tx), edge cases typed; on-chain test pending (same blockers). ADR-023. | `main` |
| 2026-06-25 | safety | Pre-trade safety score + swap gate: pure scorer `lib/safety/{types,score}.ts` (+ vitest, 5 tests); server `lib/safety/signals.ts` (Promise.allSettled, never throws, cached 300s) using `getMintAuthorities` (RPC), `getTokenSecurity`/`getTokenMarket` (BirdEye), reused `getTopHolders`, Jupiter honeypot probe; verified allowlist = curated mints (floor LOW); `GET /api/safety` always 200; SafetyBadge + ReviewModal gate (CRITICAL blocks Confirm, HIGH extra checkbox, degraded≥MEDIUM never blocks). Verified live: SOL→LOW no gate, USDC→HIGH(50) degraded 200 w/ freeze+mint signals; no secret in bundle. ADR-024. | `main` |
| 2026-06-27 | safety | RugCheck primary risk model (free, no key): `lib/safety/rugcheck.ts` (`/report/summary`, zod, cached 300s, null-on-error); `score.ts` gains `rug` param → score=normalised, level=worst-of(band, severity); `signals.ts` RugCheck-primary + Jupiter honeypot corroboration, skips BirdEye/RPC when RugCheck present, full heuristic + degraded on fallback; SafetyBadge "Verified ✓" for curated + score/100 + provenance + reasons; gate unchanged; `/api/safety` edgeCache(300). Verified live: BONK→Verified/LOW; `5B8qah…pump`→MEDIUM(21) Low Liquidity; `J6Gj…KXMSE`→HIGH(70) LP-unlocked/concentration; `4RZj…pump`→HIGH(80) creator-rugged; garbage→heuristic fallback degraded 200. 12 unit tests; no secret/rugcheck in bundle. ADR-025. | `main` |
| 2026-06-27 | C-2 | Account/portfolio on Supabase (free, server-only): `lib/supabase.ts` (service-role, throws in browser, optional-safe) + `lib/privy-auth.ts` (verify Bearer→did) + `docs/supabase-schema.sql` (RLS-on, no policies); write path: `/api/swap/send` inserts confirmed trade keyed by verified did (try/catch, never breaks swap) + ReviewModal sends token+metadata; read path: `GET /api/portfolio` (on-chain holdings via `getAllTokenBalances` valued live + cost-basis positions/PnL + history + hasDemo); `POST/DELETE /api/portfolio/seed-demo` (idempotent labeled is_demo samples / clear demo-only); Send/Withdraw: `/api/transfer/build` (web3.js SOL v0 tx, balance-gated) → Privy sign → relay; `/account` page (header/actions/holdings/positions/history/banner/Send+DepositModal) + nav Account link. Verified: 401 gates, transfer balance-gated, 0 supabase/secret in bundle, no client supabase import, typecheck/lint/build green; DB flows activate when SUPABASE_* set. +@supabase/supabase-js, pinned @solana/web3.js. ADR-026. | `main` |
| 2026-06-27 | C-2 | Receive UX + honest states: extracted shared `ui/ReceivePanel` (QR+address+copy+warning+card-soon) used by both DepositModal and a new dedicated **/receive** page (`ReceiveClient`, noindex, signed-out sign-in prompt); all entry points (nav dropdown, /account Receive+Deposit, trade-panel hint) now navigate to /receive. `/api/portfolio` returns `dbConfigured`; /account "Load/Clear sample data" disabled + inline "Connect the database…" message when SUPABASE unset (and surfaces not_configured/401/error from seed-demo) — never a silent dead click. Verified: /receive 200 + QR encodes address (SSR test), entry points link /receive, typecheck/lint/build green, 12 tests. | `main` |
| 2026-06-27 | fix | Trading first-impression fixes: `DEFAULT_TRADE_MINT`→**JUP** (SOL landing quoted SOL→SOL); base-asset guard in BuySellShell (input==output → skip quote, show "SOL is your base trading asset" note, never raw "Quote unavailable"); quote resilience — `/api/quote` SOL price via multi-source `getPrice` + token decimals fall back to Jupiter v3 (`getJupiterDecimals`) so quotes survive BirdEye 429. Chart resilience — `/api/ohlcv` one-retry on empty/429, typed `{unavailable}` + 15s negative cache, success cached 300s; PriceChart auto-retries every 15s ("Chart temporarily unavailable — retrying…") instead of a permanent dead state. Verified live (under real 429): JUP/WIF/BONK buy quotes ok, SOL base-asset note (absent on JUP), sell quotes, ohlcv typed unavailable→auto-retry; price/holders/trades independent. No free OHLCV fallback source exists (DexScreener has no public candles) → auto-retry is the graceful path. | `main` |
