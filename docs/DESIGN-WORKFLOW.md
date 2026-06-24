# DESIGN-WORKFLOW.md — how design and code fit together

Two tools, one repo.

- **Claude Design** owns the *visual design* (look, layout, brand). It produces **handoff bundles**.
- **Claude Code** owns the *codebase*. It implements the frontend code **from** the design bundles **and** builds all backend/data/logic. It is the single source of truth for what ships, and it enforces `CLAUDE.md`.

## The loop
1. **(Once) Set up the design system in Claude Design.** Point it at this repo (brand tokens in the @theme block in src/app/globals.css (Tailwind v4 is CSS-first; there is no tailwind.config) + `CLAUDE.md`) and upload the MemePilot app screenshots so designs match the real app. Optionally web-capture `fomo.family` as a landing-layout reference.
2. **Design a screen/flow** in Claude Design — chat for structure/big changes, inline comments for spacing/color/component tweaks.
3. **Export → Handoff to Claude Code** (local agent, against this repo). Sends design intent + component structure + styling, not a screenshot.
4. **Claude Code implements** it as Next.js + Tailwind, following the rules below. Save the exported reference/bundle under `design/` for traceability.
5. **Iterate later** with `/design` and `/design-sync` from the Claude Code terminal to keep both sides in sync.

## Which stages are design-led
- **Landing page (Stage 1)** → design in Claude Design first, then implement.
- **Trading page UI (Stage 4)** → design first, then implement.
- Data/logic stages (0, 2, 3, 5, 6) are Claude Code-led and reuse the designed components.

## Handoff rules (non-negotiable)
- The design is the **visual target**; `CLAUDE.md` architecture rules still win.
- Implement with our existing Tailwind tokens (`cw-bg`, `cw-green`, `cw-red`, …). **Do not** paste raw inline styles or off-brand hexes from the bundle — reconcile to our tokens/components.
- Any data-fetching the design implies still goes through our `/api` routes; no secrets reach the client.
- Components must be typed, responsive (360–1440px), and accessible (contrast, labels).

## Where designs live
- `design/landing/` and `design/trading/` — exported bundles / reference images.

## Caveats
- Beta / research preview. Iterations draw from your shared Claude usage and can run it down fast — design the screen, then stop. Known issue: inline comments can drop before Claude reads them — paste the feedback into chat instead. Large repos can lag.

> Decision recorded as ADR-012 in `DECISIONS.md`.
