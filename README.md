# Maryland Budget Intel Tool

A public, source-cited dashboard for Maryland's FY2027 operating budget. Every figure deep-links to its source PDF at the exact page. The data pipeline is fully deterministic.

**Live:** https://mdbudgetintel.netlify.app

Built for the University of Maryland iSchool capstone in partnership with NXT and the Senate Budget & Taxation Committee staff.

> **Full handoff documentation:** see [`HANDOFF.md`](./HANDOFF.md) for setup walkthroughs, screenshots, deployment, and future-scope notes.

---

## What's on the site

| Page | Route | What it shows |
|---|---|---|
| Home | `/` | Hero, ticker, 6 KPI cards, 10-slide carousel, county allocation map |
| Methodology | `/methodology` | Cross-document reconciliation, NXT pillars, NIST governance framework, source documents |
| Guardrails | `/guardrails` | What the tool will and won't do — hard limits and commitments |
| Deep-Dive | `/deep-dive/*` | Agency-level explorer (Budget Office, Technology, Variance, Anomaly Detection, IT Projects) |

The carousel covers: Fiscal Journey · Revenue→Fund→Agency Sankey · Commerce cut · MDH deficiency · Spending vs. revenue (3.2× faster) · Blueprint compliance gap · Federal-cut calculator · Reserve & Rainy Day decline · MDH 10-year CAGR · Legislature's $1.1B response.

---

## Stack

- **Framework** — Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Charts** — Plotly.js via `react-plotly.js`, dynamically imported with `ssr: false`
- **Maps** — Standalone D3 HTML (`public/budget-map.html`) loaded via iframe
- **Deep-Dive** — Evidence (SvelteKit) prebuilt into `public/deep-dive/`, served via Next.js URL rewrites
- **Styling** — Inline styles + CSS variables in `app/globals.css`; Tailwind 4 installed but used sparingly
- **Deploy** — Fully static. Netlify auto-deploys on push to `master`

No backend, no database, no server runtime. Every page prerenders at build time.

---

## Quick start

```bash
# Node 20+
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build (also doubles as type-check)
npm run start      # serve the build
npm run lint
```

To preview the Deep-Dive sub-app, see **Deep-Dive sub-app** below.

---

## Repository layout

```
md-budget-site/
├── app/                          Next.js App Router pages
│   ├── page.tsx                  Home — hero, ticker, KPIs, carousel, map
│   ├── methodology/page.tsx      Methodology — pipeline, NXT pillars, NIST governance
│   ├── guardrails/page.tsx       Guardrails — what the tool will/won't do
│   ├── layout.tsx                Header + footer wrapper
│   └── globals.css               CSS variables, animations
├── components/
│   ├── Header.tsx                Sticky header, nav, MD flag stripe
│   ├── KpiRow.tsx                6 KPI cards with IntersectionObserver entry
│   ├── Carousel.tsx              10-slide horizontal carousel
│   ├── BudgetMapEmbed.tsx        County map iframe + fullscreen toggle
│   ├── ScrollReveal.tsx          Scroll-triggered fade-up wrapper
│   └── charts/                   One file per Plotly chart (10 charts + ChartFrame)
├── dashboard/                    Evidence (SvelteKit) source for the Deep-Dive
├── scripts/
│   └── build-sankey-drilldowns.mjs   Pre-builds the Sankey drill-down JSON from xlsx
├── public/
│   ├── budget-map.html           Standalone D3 county map (iframed by BudgetMapEmbed)
│   ├── fiscal-journey.html       Standalone Plotly Fiscal Journey (iframed by chart)
│   ├── sankey_revenue.csv        Sankey input — revenue side
│   ├── sankey_agency.csv         Sankey input — agency side
│   ├── Sankey_Data.xlsx          Program-level data (source for drill-down JSON)
│   ├── sankey_drilldowns.json    Pre-built per-agency drill-down data
│   ├── logo.png                  Maryland state crest (Header)
│   └── deep-dive/                Prebuilt Evidence output (do not edit by hand)
├── HANDOFF.md                    Full handoff documentation
├── AGENTS.md / CLAUDE.md         Instructions for Claude Code sessions
├── next.config.ts                Rewrites /deep-dive/* → /deep-dive/*/index.html
└── README.md                     This file
```

---

## Data sources

Every number on the home page traces to one of these published documents:

| Document | Year | Pages used | Anchors |
|---|---|---|---|
| ACFR (Annual Comprehensive Financial Report) | 2023 | 17–22 | Reserve baseline |
| ACFR | 2024 | 18–19, 45–47 | Reserve trend, federal grants |
| ACFR | 2025 | 17–22, 45, 165, 225, 231–233 | Federal exposure, MDH spending, Blueprint baseline, structural gap |
| JCR (Joint Chairmen's Report) | 2025 | 33, 60, 233, 265, xxxiii–xxxiv | Agency cuts, Commerce cut, Blueprint cut |
| MFR (Monthly Fiscal Report) | 2015–2026 | rolling | Executive in-year tracking |
| FY2026 Budget Volume 2 | 2025 | 486–487 | Deficiency appropriations schedule |
| FY2027 Budget Highlights | 2026 | 6, 9–10, 17–24 | Operating budget total, fund allocations |
| DBM Sankey workbook | 2026 | — | Revenue → fund → agency → program mapping |

No third-party aggregators, no lobbying analyses, no news reporting feed the data pipeline. Full source-cited list lives on `/methodology` with deep links.

---

## Deep-Dive sub-app

The `/deep-dive/*` routes are an [Evidence](https://docs.evidence.dev/) (SvelteKit) project. Its source lives in `dashboard/`. Its build output lives in `public/deep-dive/` and is committed to the repo so Netlify does not need to install Evidence's dependencies at deploy time.

### Data flow

Evidence reads from a DuckDB warehouse (`../../../dbt-sql/mbtsa_work.duckdb`) built by a separate dbt project in the [companion Deep-Dive repository](https://github.com/priyanshu124/IT_state_budget_agent). Schema lives in `dashboard/sources/mbtsa/*.sql`. Built parquet files end up under `public/deep-dive/data/mbtsa/*/`.

### Working on the Deep-Dive locally

```bash
npm run dashboard:install        # one-time
npm run dashboard:dev            # → http://localhost:3000/deep-dive
```

### Publishing Deep-Dive changes

```bash
npm run dashboard:build
git add public/deep-dive dashboard
git commit -m "deep-dive: <what changed>"
git push                         # triggers Netlify rebuild
```

The header in `dashboard/pages/+layout.svelte` and the styling in `dashboard/static/custom.css` are aligned with the main site's header — use the existing brand tokens (`--nxt-deep`, `--nxt-pink`, `--nxt-purple`) when adding new chrome.

---

## Updating to a new fiscal year

When the FY2028 budget drops, the main edits live in:

1. **`components/KpiRow.tsx`** — `CARDS` array (six KPIs)
2. **`components/Carousel.tsx`** — `SLIDES` array (10 slides: titles, insights, source citations, viz components)
3. **`app/page.tsx`** — `TICKER` (10 rotating headlines) and the hero block
4. **`app/layout.tsx`** — footer year/budget badge
5. **`public/sankey_revenue.csv`, `public/sankey_agency.csv`, `public/Sankey_Data.xlsx`** — Sankey inputs (rerun `node scripts/build-sankey-drilldowns.mjs` after updating the xlsx)
6. **`public/fiscal-journey.html`** — regenerated separately from the source notebook
7. **Per-chart hardcoded series** in `components/charts/*` (e.g. `StructuralGapChart.tsx`, `ReserveChart.tsx`)
8. **Deep-Dive** — regenerate the upstream DuckDB warehouse, then `npm run dashboard:build`

A quick grep for the current fiscal year (`grep -rn "FY2027" components app`) is the fastest way to find every hardcoded reference.

See [`HANDOFF.md`](./HANDOFF.md) §8.3 for the full FY-rollover playbook.

---

## Conventions

- **Inline styles** for component layout. CSS variables in `app/globals.css` for theme tokens.
- **Chart colors are deterministic.** The `--nxt-*` tokens drive brand chrome; chart palettes are aligned with the source notebooks. Don't recolor a chart casually — it changes the visual meaning.
- **Iframe sizing is fragile.** The Fiscal Journey iframe is fixed at 860px. The Sankey iframe is 640px. If you change the inner HTML's padding or layout, update the host height.
- **Citations are load-bearing.** Every carousel slide's `source` field must match the chart's footer citation exactly. They're the audit trail.
- **Branch convention:** feature work happens on `claude/<task>-<id>` branches when Claude Code is involved, on `feat/<name>` otherwise. Never push directly to `master`.

---

## Working with Claude Code

This repository is wired for [Claude Code on the Web](https://code.claude.com/docs/en/claude-code-on-the-web). Session conventions:

- `CLAUDE.md` includes `AGENTS.md` — both are read automatically by Claude at session start.
- `AGENTS.md` warns the agent that Next.js 16 has breaking changes vs. its training data and points it to `node_modules/next/dist/docs/`.
- Feature work happens on `claude/<task>-<id>` branches; the agent never pushes to `master` directly.

---

## Deploy

Production is on Netlify, auto-deploying from `master`. The build is fully static (no SSR, no API routes); any static host works (Vercel, S3+CloudFront, GitHub Pages with rewrites).

The Deep-Dive's prebuilt output is committed to the repo, so the production build does not need to install Evidence's dependencies.

For deploying on a custom domain (e.g. via GoDaddy), see [`HANDOFF.md`](./HANDOFF.md) §9.1.

---

## Credits

University of Maryland iSchool capstone team — Aarushi Singh, Nadvi Haque, Priyanshu Gupta, James Van Doorn — in partnership with NXT and Senate Budget & Taxation Committee staff.
