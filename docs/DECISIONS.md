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
- **Decision:** Alchemy Solana mainnet RPC server-side (`SOLANA_RPC_URL`) for send/confirm/balance. Privy's client config uses a **public** RPC (`NEXT_PUBLIC_SOLANA_RPC_URL`) for low-rate client reads, so the Alchemy key never ships to the browser.
- **Consequences:** Keys stay safe; client reads are rate-limited but fine for MVP.

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

---

## Proposed / open (not yet decided)
- Banner contents: general Solana trending vs. a curated featured set? (PRD open question #3)
- Shared identity with the mobile app's Privy, or separate web accounts? (PRD open question #4)
- BirdEye paid tier vs. free-only + fallback for holders/trades? (PRD open question #5)

> When one of these is decided, convert it into a numbered ADR above.
