# PRE-LIVE-CHECKLIST.md — launch-readiness handoff

This is the single handoff doc for everything that must be done before **MemePilot**
goes live to real users. The build is **functionally complete** (Phase 1 landing +
Phase 1.5 trading: chart, holders, live trades, buy + sell execution) but is **NOT
yet live-verified on-chain** — no real swap has been signed/sent. Work the sections
below top-to-bottom; §1 and §2 are blocking.

> References: `CLAUDE.md` (rules + stack), `docs/DECISIONS.md` (ADRs), `docs/DEPLOYMENT.md` (deploy flow).

---

## 1. On-chain live test — the one thing built but unproven (BLOCKING)

The buy/sell pipeline is built and verified mechanically (real signable txs returned,
caps + balance checks enforced server-side, signing client-only) but has **never been
executed on mainnet**. See ADR-022 (buy) / ADR-023 (sell).

- [ ] **Fund the Privy embedded wallet** with ~$2 of SOL. The address is shown in the
      nav after sign-in (click it to copy). Tiny amounts only — `MAX_BUY_USD` /
      `MAX_SELL_USD` are $5 this stage.
- [ ] **Lift the Alchemy `SOLANA_RPC_URL` domain allowlist.** Server-to-server RPC
      calls carry **no `Origin`/`Referer` header**, so a *domain/referrer* allowlist
      always rejects them — this is exactly why `/api/swap/send` and `/api/position`
      currently fail with `"Unspecified origin not on whitelist"`. In the Alchemy app
      for the **keyed server key**: set **Domain allowlist → allow all**, and protect
      it with **IP allowlisting** (or leave open) instead. Domain/referrer allowlists
      are only meaningful for browser-exposed keys; this server key is safe because it
      never ships to the client (verified: 0 occurrences in `.next/static`, and the
      startup guard in `src/lib/public-env.ts` throws if a keyed URL is ever put in a
      `NEXT_PUBLIC_` var — ADR-006).
- [ ] **Run one ~$1 buy end-to-end** on a liquid pair (SOL→USDC or SOL→JUP):
      `/t/<mint>` → Sign in → enter **$1**, **0.5%** slippage → **Review buy** →
      check the risk box → **Confirm & Sign** in the Privy prompt. Confirm the
      **Solscan signature** appears and the **"Your position"** panel updates.
- [ ] **Optionally** also run a tiny real **memecoin buy**, then a **sell** (use a
      %-preset; confirm the position decreases / closes to 0 on a 100% sell).
- [ ] **Record the tx signature(s)** in `docs/PROGRESS.md` and flip Stage 6b/6c from
      🟦 build-complete to ✅ live-verified.

---

## 2. Legal — currently DRAFT placeholders (BLOCKING)

`/terms`, `/risk`, and the trade confirm/review modal ship **placeholder copy with
`[BRACKETS]`** because `legal/legal-copy-DRAFT.md` was never provided (ADR-022/023).
This must not take real funds before review.

- [ ] **Replace the `[BRACKET]` placeholders** with lawyer-reviewed copy:
      - `/terms` (Part C) — `src/app/terms/page.tsx`
      - `/risk` (Part B) — `src/app/risk/page.tsx`
      - confirm modal disclaimer A1 + risk-acknowledgement checkbox A2 —
        `src/lib/legal-copy.ts`
- [ ] **Fill in the blanks:** legal entity name, governing law/jurisdiction, contact,
      **restricted jurisdictions** (eligibility/geo), and a **platform-fee disclosure**
      if a fee is ever enabled (fee is currently OFF / $0 — fee-ready per ADR-022).
- [ ] **Have a crypto-savvy attorney review** the terms + risk disclosure **before**
      accepting real funds. *(This checklist is not legal advice.)*

---

## 3. Domain + SEO

- [ ] **Add the real domain** (e.g. `memepilot.xyz`) in **Vercel → Domains**, then add
      the records Vercel shows in **Cloudflare → DNS as DNS-only (grey cloud)** so
      Vercel manages SSL/CDN (see `docs/DEPLOYMENT.md`).
- [ ] **Set `NEXT_PUBLIC_SITE_URL`** to the real domain (Production env).
- [ ] **Verify `robots.txt` flips to indexable on production:** it returns `noindex` /
      `Disallow: /` on any non-production or non-canonical host (gated by
      `IS_INDEXABLE` in `src/lib/site.ts` = `VERCEL_ENV === "production"` &&
      non-localhost). On the real domain it should serve `Allow: /` + the `Sitemap:`
      line; the `*.vercel.app` preview stays `noindex`.
- [ ] **Don't point ads/SEO/social at the `*.vercel.app` URL** — it's intentionally
      `noindex`. Use the canonical domain everywhere.

---

## 4. Auth — production polish

Current: Privy with **email + Google** login, Solana-only non-custodial embedded
wallet (Apple deferred) — ADR-018.

- [ ] **Add the real domain to Privy → allowed origins** (currently `localhost:3000`
      + the `*.vercel.app` are allowlisted).
- [ ] **(Optional) Use your own Google OAuth creds** instead of Privy's shared ones so
      the consent screen reads "MemePilot": create a Google Cloud OAuth client, set
      the redirect URI to `https://auth.privy.io/api/v1/oauth/callback`, and add the
      credentials in the Privy dashboard.
- [ ] **(Optional) Apple sign-in** needs an Apple Developer **Services ID** — only if
      you want Apple as a third login method.

---

## 5. Vercel env — verify before launch

Set for **Production + Preview** (Vercel → Settings → Environment Variables). Hard rule:
secrets are server-only; the browser only ever sees `NEXT_PUBLIC_*` (CLAUDE.md rule 1).

- [ ] `NEXT_PUBLIC_SOLANA_RPC_URL` = a **keyless/public** RPC (e.g.
      `https://api.mainnet-beta.solana.com`) — this one ships to the browser (Privy
      client config).
- [ ] `SOLANA_RPC_URL` = the **keyed Alchemy** URL — **server-only, mark Sensitive**.
- [ ] `BIRDEYE_API_KEY` and `PRIVY_APP_SECRET` = **server-only, mark Sensitive**.
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_STORE_URL`,
      `NEXT_PUBLIC_PLAY_STORE_URL` = public.
- [ ] **Confirm the keyed Alchemy URL is NOT in any `NEXT_PUBLIC_` var** (ADR-006). The
      startup guard in `public-env.ts` fails the build if it detects an Alchemy
      `/v2/<key>` or `?api-key=` URL in the public var.

---

## 6. Cost / quota — free-tier reality

All market data is BirdEye free tier: **30K compute units/month, ~1 req/s** (ADR-003,
ADR-017). The ticker, OHLCV chart, holders, and trades all draw on it.

- [ ] **Watch BirdEye BDS Monitoring** (CU usage). Raise TTLs or upgrade the plan if CU
      climbs. Current TTLs: ticker 5 min (ADR-017), OHLCV 180s (ADR-019), holders 300s
      / trades 45s / token supply 1h (ADR-020).
- [ ] **Mind the ~1 rps limit:** bursts can cause transient `"unavailable"` on
      holders/trades (e.g. holders + token_overview + trades firing in the same second
      on a cold token load). Calls have retry-on-429, but consider **sequencing /
      spacing** the holders/overview/trades calls so they don't all fire at once.
- [ ] Re-confirm Jupiter quote/swap usage is fine on the keyless **lite** host
      (`lite-api.jup.ag`); add `JUPITER_API_KEY` (server-only) to move to the pro host
      if volume grows (ADR-021 — auto-switches when the key is set).

---

## 7. Optional hardening before scale

- [ ] **Rename the App Store / Play store listings** to MemePilot. The mobile app is
      still branded "ChadWallet"; the store URLs/IDs are intentionally unchanged
      (ADR-016) so the existing links keep working until the listing is renamed.
- [ ] **Update `public/brand/logo-mark.svg`** internal `aria-label="ChadWallet"` →
      `"MemePilot"` (not user-facing — the mark renders via CSS mask — but tidy).
- [ ] Replace the placeholder OG image / brand mark with final art if desired (the OG
      card is generated dynamically via `next/og` and is on-brand but generic).
- [ ] Consider rotating the Alchemy key if it was ever built into a deployed bundle
      while it sat in the public var (it was only ever in a local build — `.env.local`
      and `.next` are gitignored — but rotate to be safe).

---

### Definition of "live-ready"
§1 (one real on-chain swap confirmed) and §2 (lawyer-reviewed legal copy) are done,
§3–§5 verified on the production domain, and BirdEye CU usage is being monitored.
