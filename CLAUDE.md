# CLAUDE.md — ChadWallet Web

Operating manual for Claude Code. **Read this first, every session.** Detailed plan and rationale live in `docs/`.

> Don't run `/init` — `CLAUDE.md` is hand-maintained. Run `/memory` to confirm it's loaded.

---

## What this is
A marketing **landing page** (must-have) + a **web trading page** (bonus) for **ChadWallet**, a social-first **Solana** memecoin trading wallet. It's the web companion to the existing mobile app, modeled on `fomo.family`. The full product spec is the PRD in this Claude project; the build details are in `docs/`.

## Source of truth — read in this order
1. **`CLAUDE.md`** (this file) — rules + repo map.
2. **`docs/PLAN.md`** — staged build plan, tasks, and acceptance criteria. What to build, in what order.
3. **`docs/DESIGN-WORKFLOW.md`** — how Claude Design and Claude Code split the work + handoff rules.
4. **`docs/DECISIONS.md`** — why each tool/approach was chosen (ADRs). **Don't contradict an ADR without proposing a new one.**
5. **`docs/PROGRESS.md`** — current status + session log. **Update it as you work.**

## Stack
- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**
- **Privy** — auth (Apple / Google / email) + **non-custodial Solana embedded wallets**
- **BirdEye** — token market data (price, trending, OHLCV, holders, trades), accessed only through our server proxy
- **Alchemy** — Solana RPC (send transactions, read balances)
- **Jupiter** — swap engine (buy / sell)
- **TradingView Lightweight Charts** — price chart (NOT the Advanced Charting Library)
- **Supabase** — Postgres, added only when auth/trading lands
- **Deploy:** Vercel · **DNS/CDN:** Cloudflare

## Hard rules (non-negotiable)
1. **Secrets are server-only.** Never put BirdEye / Alchemy / Jupiter / Privy-secret keys in client code. The browser may only ever see `NEXT_PUBLIC_*` values (Privy **App ID**, site URL, store links, a public RPC). If you're about to reference a secret inside a Client Component, **stop**.
2. **The client never calls a third party directly.** All BirdEye / Jupiter / RPC calls go through our `src/app/api/*` routes (proxy → validate → cache).
3. **Cache everything.** Trending/banner 30–60s; token detail & OHLCV 10–15s. BirdEye free tier = **30K compute units/month at ~1 req/s**. Treat upstream calls as scarce — one upstream call should serve many visitors.
4. **Solana-only, non-custodial only.** Never hold or import user keys. Privy embedded wallet only.
5. **Never auto-execute a swap.** A buy/sell fires *only* on an explicit user click, *after* showing the quote, slippage, and the risk disclaimer. Test with tiny amounts on mainnet.
6. **Validate at the boundary.** Parse every external response with `zod` before using it. Every data fetch needs **loading + empty + error** states. No `any`.
7. **On-brand only.** Use the design tokens (below / the @theme block in src/app/globals.css (Tailwind v4 is CSS-first; there is no tailwind.config)). No off-brand colors.
8. **Stay in scope.** Ship landing before trading. Do **not** build Non-Goals: coin launch/relaunch, social feed, KOL copy-trading, leaderboards, referrals/rewards, multi-chain, MoonPay embed, candlestick TradingView terminal.
9. **Small, reviewed steps.** One stage per branch; conventional commits. After each stage: run checks → update `docs/PROGRESS.md` and `docs/DECISIONS.md` → **stop for human review. Do not start the next stage.**
10. `CLAUDE.md` is context, not a security boundary. Real enforcement is env vars, permissions, and CI — but follow these rules anyway.

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (**must pass before review**)
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit` (**must pass before review**)

## Repo map (target — created across stages)
```
chadwallet-web/
├── CLAUDE.md                  # this file
├── README.md
├── .env.example               # env var template (copy to .env.local)
├── docs/
│   ├── PLAN.md                # staged plan + acceptance criteria
│   ├── DECISIONS.md           # ADRs (why)
│   ├── PROGRESS.md            # status + session log (keep updated)
│   └── PROMPTS.md             # the per-stage Claude Code prompts
├── .claude/skills/review-gate/SKILL.md   # /review-gate stage acceptance check
├── public/brand/             # logo (light+dark), app-store badges, screenshots
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                  # landing
    │   ├── providers.tsx            # Privy provider (client)
    │   ├── t/[address]/page.tsx     # trading page
    │   └── api/
    │       ├── health/route.ts
    │       ├── trending/route.ts    # BirdEye trending (cached)
    │       ├── token/[address]/route.ts
    │       ├── ohlcv/route.ts
    │       ├── holders/route.ts
    │       ├── trades/route.ts
    │       ├── me/route.ts          # verifies Privy token
    │       └── swap/
    │           ├── quote/route.ts
    │           └── build/route.ts
    ├── components/{landing,trading,ui}/
    ├── lib/
    │   ├── env.ts            # zod-validated env (server vs public)
    │   ├── cache.ts          # cache helper (memory now; KV later)
    │   ├── birdeye.ts        # server-only client
    │   ├── jupiter.ts        # server-only client
    │   ├── solana.ts         # RPC helpers
    │   └── format.ts         # price/number/address formatting
    └── styles/
```

## Brand tokens (extracted from the app screenshots)
```
--cw-bg          #020818   near-black navy app background
--cw-surface     #0A1122   cards / elevated panels
--cw-green       #11FE9C   PRIMARY: buy, CTAs, positive %
--cw-green-press #10E48C   pressed/hover
--cw-red         #FF4334   sell, negative %, down
--cw-text        #FFFFFF   primary text
--cw-text-muted  #8A93A6   secondary text
--cw-splash-bg   #FFFFFF   splash background (black "chad" line-art logo)
```
Buttons: full-width pill, green fill + dark text (buy), red fill (sell). Vibe: dark, high-contrast, bright-green accents, big bold price numerals. Pull final logo SVGs (light + dark variants) from the brand Drive folder into `public/brand/`.

## Definition of Done (every task)
- `typecheck` + `lint` + `build` all pass
- no secret reachable from the client bundle; no direct third-party calls from the client
- loading / empty / error states present for every fetch
- responsive on mobile + desktop, on-brand
- `docs/PROGRESS.md` updated

## When unsure
Use `/plan` (plan mode) for any multi-file change before editing. If a request conflicts with an ADR, propose updating `docs/DECISIONS.md` first. **Ask before** adding a heavy dependency or any paid service.
