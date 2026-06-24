# public/brand — brand assets

Real MemePilot brand assets live here (the screenshots show the published app).
The landing page imports several of these directly (static imports → optimized
by next/image).

## Current layout
- `logo/light.png` — black "chad" line-art on light (use on light/splash bg)
- `logo/dark.png` — white "chad" line-art on dark (use on the app's dark bg)
- `app-store/` — app screenshots (1242×2688): `token.png`, `kol.png`,
  `launch.png`, `portfolio.png`, `discover.png`, `search.png`, `deposit.png`,
  `splash.png`, `x.png`
- `flow/` — multi-step flow screens
- `video/chadwallet.mp4` — promo video

## Used by Stage 1 landing
- Hero + feature 01 → `app-store/token.png`
- feature 02 → `app-store/kol.png` · feature 03 → `app-store/launch.png`
- feature 04 → `app-store/portfolio.png`

## Still ideal to add
- **Transparent logo SVGs** (`logo-mark.svg` light + dark) — the header/footer
  mark currently uses an on-brand CSS placeholder (`Logo.tsx`) because the PNG
  logos have baked-in backgrounds and aren't sized for a small mark. Drop in a
  transparent SVG and swap the one block in `Logo.tsx`.
- **Official store badges** (`app-store-badge.svg`, `google-play-badge.svg`) —
  `DownloadButtons.tsx` renders on-brand placeholder badges until then.
