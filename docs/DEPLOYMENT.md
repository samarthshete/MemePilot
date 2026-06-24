# DEPLOYMENT.md — ship & production readiness

How MemePilot Web goes live and stays healthy. The **landing page is independently shippable** — deploy it now; later stages auto-deploy on top.

## Strategy
- **Host:** Vercel (Next.js-native, free tier, push-to-deploy). **DNS:** Cloudflare.
- **Flow:** merge a green, reviewed stage branch → `main` → Vercel **production** deploy. Every PR gets a Vercel **Preview URL** for review before merge.
- Deploy the landing now. Add each new env var to Vercel **before** merging the stage that needs it.

## One-time setup (ops — done in dashboards, not by Claude Code)
1. **GitHub:** create a repo, push `main`.
2. **Vercel:** New Project → import the repo → framework auto-detected (Next.js) → Deploy. You get a `*.vercel.app` URL immediately.
3. **Env vars** (Vercel → Project → Settings → Environment Variables), set for **Production + Preview**:
   - `NEXT_PUBLIC_SITE_URL` = your live URL (the `*.vercel.app` one until the domain is live, then `https://memepilot.xyz`)
   - `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`
   - Added as their stage lands: `BIRDEYE_API_KEY` (Stage 2); `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` (Stage 3); `SOLANA_RPC_URL`, `JUPITER_API_KEY` (Stage 6).
   - **Server-only vars must NOT have a `NEXT_PUBLIC_` prefix.** Never paste secrets into client env.
4. **Domain (Cloudflare → Vercel):** in Vercel → Domains, add `memepilot.xyz`. Vercel shows the **exact DNS records** to create. In Cloudflare → DNS, add those records.
   - **Simplest reliable setup:** set those records to **DNS only (grey cloud)** so Vercel manages SSL + CDN. This avoids SSL/redirect loops.
   - If you later proxy through Cloudflare (orange cloud) for its WAF/cache, switch **SSL/TLS mode to Full (strict)**.
5. Verify: HTTPS works, `www` → apex redirect, and preview URLs are `noindex` (Vercel sets this automatically on non-production deploys).

## Production-readiness checklist (code — Claude Code helps satisfy)
**Security**
- [ ] Security headers via `next.config` `headers()`: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options/`frame-ancestors`, and a Content-Security-Policy.
- [ ] No secrets in the client bundle (only `NEXT_PUBLIC_*`). `.env.local` gitignored; prod secrets only in Vercel.

**SEO / crawl**
- [ ] `app/robots.ts` + `app/sitemap.ts`. Canonical URL + full metadata + OG image (done). Preview hosts `noindex`.

**Reliability / UX**
- [ ] Branded `not-found.tsx` (404) + `error.tsx` (500). No console errors, no horizontal scroll, AA contrast, keyboard nav.
- [ ] Lighthouse ≥ 90 (Perf/SEO/Best-practices/A11y); LCP < 2.5s.

**Analytics / monitoring**
- [ ] Vercel Analytics (or PostHog) instrumenting the Phase-1 metric: **download click-through**. (optional) Sentry for errors.

**Legal** (stub now; real copy before the Buy button ships)
- [ ] `/privacy` + `/terms` pages (footer links wired). Risk disclaimer is **required before Stage 6 (Buy)**.

**Ops**
- [ ] Vercel build is the CI gate (typecheck/lint/build run on every deploy). Optional: a GitHub Action mirroring the checks.

## Per-stage deploy note
After each reviewed stage merges to `main`: confirm the production deploy is green and smoke-test the new feature on the live URL. Roll back via Vercel's "Promote previous deployment" if a deploy breaks.

> Hosting/readiness decisions recorded as ADR-001 (Vercel + Cloudflare) and ADR-014 (production hardening).
