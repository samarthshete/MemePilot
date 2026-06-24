# PROGRESS.md — ChadWallet Web status

**Keep this current.** At the end of every stage, check off tasks, set the status, and add a session-log row.

**Current focus:** Stage 0 ✅ complete — awaiting human review before Stage 1
**Last updated:** 2026-06-24 (Stage 0 wiring landed; typecheck/lint/build green)
**Live URL:** _not deployed_
**Active branch:** `stage-0-wiring`

Status key: ⬜ not started · 🟦 in progress · ✅ done · ⛔ blocked

---

## Phase 1 — Landing (shippable)
- ✅ **Stage 0 — Scaffold & guardrails**
  - ✅ create-next-app (App Router, TS, Tailwind, ESLint, src/, `@/*`); docs moved to `docs/`; `.env.example` added
  - ✅ `typecheck` script + strict TS (strict already on)
  - ✅ brand tokens in `globals.css` `@theme` (Tailwind v4) + dark base layout; minimal on-brand placeholder page
  - ✅ `lib/env.ts` (zod, server/public split), `lib/cache.ts` (TTL), `/api/health` → `{ ok: true }`
  - ✅ typecheck + lint + build green; `/api/health` verified 200
- ⬜ **Stage 1 — Landing page (static)**
  - ⬜ hero · download buttons (device detect) · feature sections · footer · SEO/OG · responsive
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
