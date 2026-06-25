# PROGRESS.md — MemePilot Web status

**Keep this current.** At the end of every stage, check off tasks, set the status, and add a session-log row.

**Current focus:** Stage 3 ✅ — Privy auth + Solana embedded wallet; **Phase 1 shippable**, ready to deploy
**Last updated:** 2026-06-25 (Stage 3: Privy email+Google login, Solana-only embedded wallet, /api/me verify, CSP)
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
- ⬜ **Stage 4 — Trading page shell + chart** (`/t/[address]`, Lightweight Charts, `/api/ohlcv`)
- ⬜ **Stage 5 — Holders + live trades** (`/api/holders`, `/api/trades`, tabs, polling)
- ⬜ **Stage 6 — Buy & Sell** (Jupiter quote/build → Privy sign → Alchemy send → position)

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
