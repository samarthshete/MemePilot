# PROGRESS.md — ChadWallet Web status

**Keep this current.** At the end of every stage, check off tasks, set the status, and add a session-log row.

**Current focus:** Stage 1 ✅ complete — awaiting human review before Stage 2
**Last updated:** 2026-06-24 (Stage 1 landing page landed; typecheck/lint/build green)
**Live URL:** _not deployed_
**Active branch:** `stage-1-landing`

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
  - ⚠️ brand assets still missing — phones/logo render on-brand placeholders (see DESIGN-WORKFLOW / session notes)
  - ✅ typecheck + lint + build green; page/OG/health verified 200
- ⬜ **Stage 2 — Live token banner**
  - ⬜ `/api/trending` (BirdEye, cached, zod) + fallback
  - ⬜ top + bottom marquee, items link to `/t/<address>`
- ⬜ **Stage 3 — Auth (Privy)**
  - ⬜ PrivyProvider, Apple/Google login, Solana embedded wallet, `/api/me` token verify
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
