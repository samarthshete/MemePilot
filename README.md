# MemePilot Web

A marketing **landing page** + a **web trading page** for **MemePilot**, a
social-first, non-custodial **Solana** memecoin trading wallet. This is the web
companion to the existing mobile app.

## Stack
- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4** (CSS-first; brand
  tokens live in the `@theme` block of `src/app/globals.css` — there is no `tailwind.config`)
- **Privy** — auth + non-custodial Solana embedded wallets
- **BirdEye** — token market data (via our server proxy, cached)
- **Alchemy** — Solana RPC · **Jupiter** — swap engine
- **TradingView Lightweight Charts** · **Supabase** (added with auth/trading)
- **Deploy:** Vercel · **DNS/CDN:** Cloudflare

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`

## Source of truth — read these first
- **[`CLAUDE.md`](./CLAUDE.md)** — operating rules + repo map.
- **[`docs/PLAN.md`](./docs/PLAN.md)** — staged build plan + acceptance criteria.
- **[`docs/DESIGN-WORKFLOW.md`](./docs/DESIGN-WORKFLOW.md)** — how Claude Design and Claude Code split the work.
- `docs/DECISIONS.md` (ADRs) · `docs/PROGRESS.md` (status).

Copy `.env.example` → `.env.local` and fill in keys. Secrets are server-only;
the browser only ever sees `NEXT_PUBLIC_*` values.
