import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. We ship a real (enforced) policy that matches what
 * the landing page actually loads:
 *  - script-src: 'self' for Next's static chunks + Vercel Analytics
 *    (va.vercel-scripts.com). 'unsafe-inline' is kept — see note below.
 *  - style-src: 'self' + 'unsafe-inline' (Next/React inject inline <style> and
 *    we use a few inline style attributes); fonts.googleapis.com as a harmless
 *    allowance (next/font self-hosts, so it isn't actually hit at runtime).
 *  - font-src: 'self' (next/font self-hosts) + fonts.gstatic.com (belt-and-suspenders).
 *  - img-src: 'self' data: blob: — next/image + blur-up placeholders.
 *  - connect-src: 'self' + Vercel Analytics beacon.
 *
 * 'unsafe-inline' kept (documented tradeoff):
 *  - script-src 'unsafe-inline': Next.js App Router injects inline bootstrap/
 *    hydration scripts. Removing it requires nonce-based CSP via middleware,
 *    which forces every page to render dynamically — not worth it for a static
 *    marketing page. Tighten with a nonce when auth/trading lands (Stage 3+).
 *  - style-src 'unsafe-inline': inline style attributes (e.g. ticker duration
 *    var, reveal transition-delay) + Next/React injected styles. CSP3 hashing
 *    of style attributes isn't broadly practical here.
 * Dev-only: 'unsafe-eval' + ws: are added for Turbopack HMR; production omits them.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self' https://va.vercel-scripts.com${isDev ? " ws:" : ""}`,
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't walk up the
  // filesystem inferring a root (which also avoids a spurious multi-root warning).
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
