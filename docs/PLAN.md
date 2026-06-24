# PLAN.md — ChadWallet Web build plan

Staged plan. **Phase 1 (Stages 0–3) is the shippable landing page.** Stages 4–6 are the bonus trading page. Each stage ends at a **human review gate** — Claude Code stops, you review, then you start the next stage.

Legend: ✅ ship-critical · 🟡 bonus · Effort is rough.

---

## Stage 0 — Scaffold & guardrails ✅ (~½ day)
**Goal:** an empty but correctly-wired, on-brand Next.js app that builds clean.

Tasks
- `create-next-app` (App Router, TypeScript, Tailwind, ESLint) into this repo, preserving `CLAUDE.md`, `docs/`, `.claude/`, `.env.example`.
- Add `"typecheck": "tsc --noEmit"` to scripts; TS strict on.
- Wire brand tokens into the @theme block in src/app/globals.css (Tailwind v4 is CSS-first; there is no tailwind.config) (palette in CLAUDE.md). Add a dark base layout.
- `src/lib/env.ts` — zod-validated env loader that separates public vs server vars and throws on missing.
- `src/lib/cache.ts` — tiny TTL cache helper (in-memory now; swappable for KV later).
- `src/app/api/health/route.ts` — returns `{ ok: true }`.
- `public/brand/` placeholder + README note to drop real logo SVGs there.

Acceptance criteria
- `npm run dev` shows a dark, on-brand placeholder page using the green CTA color.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- `/api/health` returns ok. No product features yet.

---

## Stage 1 — Landing page (static) ✅ (~1–2 days)
**Goal:** brand-accurate marketing page that drives downloads. Mirrors fomo.family structure.

_Design-led: implement from the Claude Design handoff bundle in design/landing/ (see docs/DESIGN-WORKFLOW.md). The design is the visual target; Hard Rules still apply._

Tasks
- **Hero:** logo, headline ("Find the next 100x memecoins here"), sub-copy, primary CTA.
- **Download buttons:** App Store + Google Play badges; device auto-detect (iOS→App Store, Android→Play, desktop→show both). Links from `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL`.
- **Feature sections** (reuse app screenshots from `public/brand/`): fast trading · follow KOLs · launch coins · track assets.
- **Footer:** socials, privacy, terms placeholders.
- **SEO/OG:** title, description, OG image, theme-color `#020818`.
- Responsive pass (mobile-first).

Acceptance criteria
- Looks on-brand on mobile + desktop; no layout breakage at 360px and 1440px.
- Download buttons route to the correct store per device.
- Lighthouse performance reasonable; LCP target < 2.5s.
- DoD checklist (CLAUDE.md) satisfied.

---

## Stage 2 — Live token banner ✅ (~1 day)
**Goal:** the requested rotating token ticker (top + bottom), real data, cached.

Tasks
- `GET /api/trending` → `src/lib/birdeye.ts` fetches BirdEye trending/token-list, **cached 30–60s**, response validated with zod, returns a clean typed list (address, symbol, name, logo, price, change24h).
- Graceful fallback: if the trending endpoint is gated/unavailable, fall back per ADR-003 (or a short curated list) so the banner never crashes.
- Top + bottom **marquee ticker** component: logo · symbol · price · % change (green/red). Smooth CSS scroll; pause on hover.
- Each item links to `/t/<address>`. If the trading page isn't built yet, route to a minimal placeholder (or external chart) — never a dead link.

Acceptance criteria
- Banner shows **real** trending Solana tokens with live-ish prices.
- Only **one** upstream BirdEye call per cache window (verify via logs).
- Zero BirdEye key or direct BirdEye call in the client bundle.
- Loading + error states handled (skeleton shimmer + quiet fallback).

---

## Stage 3 — Auth (Privy) ✅ (~½–1 day)
**Goal:** sign in with Apple/Google; a non-custodial Solana wallet appears.

Tasks
- `src/app/providers.tsx` — `PrivyProvider` (client) with Apple/Google/email login, `walletChainType: 'solana-only'`, `embeddedWallets.createOnLogin`, client RPC = `NEXT_PUBLIC_SOLANA_RPC_URL`.
- Header "Sign in" button → Privy modal; logged-in state shows truncated wallet address + logout.
- Confirm a **non-custodial embedded Solana wallet** is created on first login.
- `GET /api/me` — verifies the Privy access token server-side (`PRIVY_APP_SECRET`) and returns the user id + wallet.

Acceptance criteria
- Can log in (Apple/Google/email) and log out; wallet address renders.
- Server verifies the Privy token (reject when missing/invalid).
- Browsing the site never *requires* login (login only gates buying later).

> 🎯 **End of Stage 3 = shippable Phase 1.** Review, deploy to Vercel, point Cloudflare DNS. Everything below is the bonus.

---

## Stage 4 — Trading page shell + chart 🟡 (~1–2 days)
**Goal:** `/t/[address]` three-column layout with a real price chart. Read-only, no login.

_Design-led: implement from the Claude Design handoff bundle in design/trading/ (see docs/DESIGN-WORKFLOW.md). The design is the visual target; Hard Rules still apply._

Tasks
- Three columns: **left** trending list (reuse `/api/trending`, click loads a token), **middle** token header (logo, name, $price, % change, contract chip) + **Lightweight Charts** line/area chart, **right** empty Buy/Sell placeholder.
- `GET /api/ohlcv?address=&interval=` → BirdEye OHLCV, cached per interval, zod-validated. Feed Lightweight Charts.
- Responsive: columns stack on mobile (chart-first).

Acceptance criteria
- Chart renders **real** OHLCV for the selected token; interval switch works.
- Left list click swaps the middle/right content without full reload.
- No keys/direct calls in client; loading/empty/error states present.

---

## Stage 5 — Holders + live trades 🟡 (~1 day)
**Goal:** the research tabs in the middle column.

Tasks
- `GET /api/holders?address=` and `GET /api/trades?address=` → BirdEye (or ADR-003 fallback), cached 10–15s.
- Middle-column tabs: **Holders** (top wallets %) | **Live Trades** (who bought/sold, amount, time).
- Poll every ~10–15s (cached) — no websockets yet.

Acceptance criteria
- Real holders + recent trades render; tab switch works.
- Polling respects the cache (no per-tick upstream hammering); free tier safe.
- Fallback wired if the endpoint is gated.

---

## Stage 6 — Buy & Sell 🟡 (~2–3 days) — highest risk, do LAST
**Goal:** real end-to-end swap, signed by Privy, sent via Alchemy.

Tasks
- `POST /api/swap/quote` and `POST /api/swap/build` → `src/lib/jupiter.ts` (managed flow: quote → build/order). Server-built, keys server-side.
- Right panel: amount input + presets ($10/$50/$100), **Buy/Sell**, slippage setting, and a visible **"Trade at your own risk"** disclaimer.
- Flow: get quote → show expected output + slippage → user clicks confirm → **Privy signs** → send via **Alchemy RPC** → poll confirmation → show signature.
- **Your position:** qty / value / PnL from wallet balance + BirdEye price.
- Note (don't enable) the Jupiter platform-fee param for later monetization.

Acceptance criteria
- A real **small** buy and sell complete end-to-end on mainnet; tx signature shown.
- Swap **never** auto-submits — only on explicit confirm after quote+slippage+disclaimer.
- Errors handled (no route, slippage exceeded, user rejects, tx fails) with clear messages.
- Position panel updates after a trade.

---

## Out of scope (do not build — see DECISIONS ADR-007)
Coin launch/relaunch · social feed · KOL copy-trading · leaderboards · referrals/rewards · multi-chain · MoonPay embed (link out only) · candlestick TradingView terminal · custodial wallets · own indexer.

## Review gate (run at the end of every stage)
Use `/review-gate` (in `.claude/skills/`) or manually verify the stage's acceptance criteria + the global DoD, then stop for human review.
