# ChadWallet Web

The web companion to the ChadWallet Solana trading app — a live landing page and full trading interface, powered by real on-chain data.

**Live:** https://meme-pilot.vercel.app  
**Deploy parity:** The commit SHA in the site footer links to the exact GitHub commit running in production. Check `/api/health` for the current SHA as JSON.

---

## What it does

The landing page shows a live token ticker (top and bottom) pulling from BirdEye. Click any token and it opens a three-column trading page: trending tokens on the left, a price chart with holders and live trades in the middle, and buy/sell with your position on the right.

Before any trade, the app scores the token through RugCheck — checking mint/freeze authority, LP locks, holder concentration, sniper activity, and whether the creator has rugged before. A clean token shows a Verified badge. A risky one surfaces the specific reasons and gates the trade: high risk requires acknowledgement, critical risk blocks the buy entirely.

Sign-in is Privy (Google or Apple), which creates a non-custodial Solana embedded wallet — no seed phrase. The server never holds a key. Every transaction is signed by the user in their Privy wallet; the server only relays the already-signed bytes and confirms on-chain via Alchemy. There is no server-side key and no identity-to-wallet mapping that could be abused.

The account page reads real on-chain holdings, shows cost-basis positions with unrealized PnL (Supabase), and lets you send, receive, deposit, and withdraw.

---

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (CSS-first, tokens in `@theme`)
- **Auth + wallet:** Privy — non-custodial embedded Solana wallet, no seed phrase
- **Swaps:** Jupiter (quote → build → user signs → relay → confirm)
- **Market data:** BirdEye (trending, OHLCV, holders, live trades) with Jupiter + DexScreener fallback
- **Risk model:** RugCheck API + independent honeypot probe
- **Portfolio:** Supabase (real on-chain holdings + trade history)
- **Deploy:** Vercel (push to main → auto-deploy)

---

## Running locally

```bash
git clone https://github.com/samarthshete/MemePilot.git
cd MemePilot
npm install
cp .env.example .env.local
# fill in .env.local — see Environment variables below
npm run dev
```

The app runs at `http://localhost:3000`. Market data degrades gracefully if API keys are missing — the banner falls back to a curated token list.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | What it's for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app identifier (public) | privy.io → dashboard → App ID |
| `BIRDEYE_API_KEY` | Market data — trending, prices, OHLCV, holders, trades | birdeye.so → API |
| `SOLANA_RPC_URL` | Keyed Alchemy RPC for server-side relay + balance reads | alchemy.com → Solana app |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public (keyless) RPC for client-side reads | Use a public endpoint |
| `JUPITER_API_KEY` | Jupiter swap API (optional — falls back to keyless lite endpoint) | dev.jup.ag |
| `SUPABASE_URL` | Supabase project URL | supabase.com → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server key (never exposed client-side) | supabase.com → Settings → API (service_role) |
| `NEXT_PUBLIC_APP_STORE_URL` | iOS App Store link | Your store listing |
| `NEXT_PUBLIC_PLAY_STORE_URL` | Google Play link | Your store listing |

To set up the portfolio database, run `docs/supabase-schema.sql` once in your Supabase SQL editor.

---

## Architecture

The client never calls upstream services directly — everything goes through `/api/*` routes on the server. This keeps all API keys server-side and lets the server enforce the $5 trade cap and Privy authentication before anything reaches Jupiter or Alchemy.

Swap relay: the server calls Jupiter to build a transaction, sends the unsigned bytes to the client, the user signs in Privy, and the client posts the signed bytes back. The server relays them via Alchemy and returns the confirmation. The server never holds a key and only touches pre-signed bytes.

Market data routes use HTTP `Cache-Control` headers (`s-maxage` + `stale-while-revalidate`) so one upstream call serves many visitors — the main way this stays inside BirdEye's free tier under real traffic.

---

## Deploy

Push to `main` → Vercel auto-deploys. Set the environment variables in Vercel → Settings → Environment Variables (mark `SUPABASE_SERVICE_ROLE_KEY` and `BIRDEYE_API_KEY` as sensitive). Run `docs/supabase-schema.sql` once in Supabase.
