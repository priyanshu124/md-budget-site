# Maryland Budget Intel Tool
## Technical Handoff Documentation

**University of Maryland iSchool Capstone Project**
In partnership with NXT and the Senate Budget & Taxation Committee Staff

| | |
|---|---|
| Live Site | https://mdbudgetintel.netlify.app |
| Home Page Repository | https://github.com/asingh3506/md-budget-site |
| Deep-Dive Repository | https://github.com/priyanshu124/IT_state_budget_agent |
| Contributors | Aarushi Singh · Nadvi Haque · Priyanshu Gupta · James Van Doorn |
| Document Version | 1.0 — May 2026 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Home Page Features](#3-home-page-features)
4. [Deep-Dive Features](#4-deep-dive-features)
5. [Data Sources](#5-data-sources)
6. [Setting Up the Home Page Locally](#6-setting-up-the-home-page-locally)
7. [Setting Up the Deep-Dive Locally](#7-setting-up-the-deep-dive-locally)
8. [Updating the Live Site](#8-updating-the-live-site)
9. [Future Scope](#9-future-scope)
10. [Known Limitations](#10-known-limitations)
11. [Glossary](#11-glossary)
12. [Contributors and Contact](#12-contributors-and-contact)

> **Screenshot conventions.** Every place this document says `[SCREENSHOT: ...]` is an instruction for the maintainer to capture a screen from https://mdbudgetintel.netlify.app and embed it at that location. The bracket text describes what the screenshot should show. Recommended size: 1400 × 900 px, PNG, saved under `docs/screenshots/` in the repository.

---

## 1. Executive Summary

Maryland Budget Intel Tool (MBIT) is a public fiscal analysis dashboard for Maryland's FY2027 operating budget. It transforms published government documents into interactive visualizations, drill-downs, and source-cited data tables designed for legislators, legislative staffers, journalists, policy analysts, and the general public.

The platform is composed of two connected applications served from a single domain:

- The **Home Page** delivers a curated narrative — six KPI cards, a ten-slide chart carousel, a county allocation map, a methodology page, and a guardrails page.
- The **Deep-Dive** delivers a deeper analytical workbench — agency-level explorers, TBM-classified IT spend, year-over-year variance analysis, anomaly detection, and a MITDP project explorer covering 80+ Maryland agencies across FY2017–FY2027.

Both applications publish every figure with a citation that links directly to the source page of the underlying audited document. The data pipeline is fully deterministic and reproducible from public PDFs and open government APIs.

`[SCREENSHOT: Home page hero showing the headline, KPI row, and the start of the carousel]`

---

## 2. System Architecture

### 2.1 Two-repository structure

The project is split across two GitHub repositories, each with a distinct responsibility:

| Repository | Owner | What lives here |
|---|---|---|
| `asingh3506/md-budget-site` | Home Page team | Next.js home page, Methodology, Guardrails, the pre-built Deep-Dive bundle, Netlify deploy config |
| `priyanshu124/IT_state_budget_agent` | Deep-Dive team | Python ingestion, DBT transformations, TBM classification agents, Evidence dashboard source, raw and processed data |

### 2.2 How the two apps connect

The home page is the entry point. When the Deep-Dive is ready to publish:

1. The Evidence dashboard is **built into static HTML** (`npm run dashboard:build`).
2. The build output is committed into `public/deep-dive/` in the home-page repository.
3. Netlify rebuilds the home page on push to `master`. The static Deep-Dive ships under the same domain at `/deep-dive/*`.
4. Next.js URL rewrites map `/deep-dive/<page>` to the pre-built `index.html` for that page.

The result: one domain, one deploy, two apps. Users move between Home and Deep-Dive through the navigation bar without leaving the site.

### 2.3 Data flow

```
                                       Home Page
                                ┌────────────────────────┐
   Published PDFs ─┐            │  Static CSVs + JSON    │
   (ACFR · JCR ·   │  manual    │  ↓                     │
    MFR · DBM)     ├──extract──▶│  Plotly + D3 charts    │
                   │            │  KPI cards · Map       │
                   │            └────────────────────────┘
                   │
                   │                    Deep-Dive
                   │            ┌────────────────────────┐
                   ├───────────▶│  load_data.py          │
                   │            │  → DuckDB (raw)        │
   DBM Open Data ──┤            │  → DBT marts           │
   API (live)      │            │  → Claude classifier   │
                   │            │  → fct_it_spend        │
   State Aid ──────┘            │  → Evidence pages      │
   disclosure                   │  → public/deep-dive/   │
                                └────────────────────────┘
```

The home page processes its data manually through Python notebooks at update time. The Deep-Dive runs an automated pipeline: ingestion → DBT transformations → AI-assisted TBM classification → analytical marts → Evidence build.

`[SCREENSHOT: The dashboard's navigation bar with Home, Deep-Dive, Methodology, Guardrails links]`

---

## 3. Home Page Features

### 3.1 KPI cards

Six cards across the top of the home page summarize Maryland's FY2027 fiscal position. Each card has a label, a headline number, a one-line context note, and a colored top border that indicates direction.

| Card | Color | Meaning |
|---|---|---|
| FY2027 Operating Budget | Purple | Informational headline |
| Shortfall Closed | Green | On track |
| Structural Deficit Ahead | Red | Worsening |
| Budget Surplus | Green | On track |
| Rainy Day Fund | Amber | Caution |
| DDA Reduction | Red | Worsening |

`[SCREENSHOT: The full six-card KPI row]`

### 3.2 Chart carousel

Ten interactive visualizations in a horizontal carousel. Each slide has a chart on the left, a commentary sidebar on the right with the insight and source citation, and progress controls at top and bottom.

Navigation: drag with the mouse, use ← / → arrow keys, click the dot indicators at the top, or click the numbered tabs at the bottom.

| # | Title | What it shows |
|---|---|---|
| 1 | Maryland's Fiscal Journey | Six-year timeline (FY2021–FY2026), each year with a donut and three strategic priorities |
| 2 | Budget Flow: Revenue to Agency | Three-layer Sankey with year toggle (FY2025/26/27) and agency drill-down to top programs |
| 3 | Dept. of Commerce: $27.5M Cut | Bar chart of cuts by program area |
| 4 | One Agency Caused 77¢ of Every Deficit Dollar | MDH share of FY2025 deficiency appropriations |
| 5 | Spending Is Growing 4× Faster Than Revenue | Ten-year revenue vs. expenditure curves plus FY2030 projection |
| 6 | A $65M Cut Creates a ~$1B Compliance Deficit | Blueprint mandate vs. budget trajectory |
| 7 | Federal Cut Calculator (Interactive) | Slider modeling 0–20% federal-funds cut by agency |
| 8 | Maryland's Two Fiscal Safety Nets in Decline | Rainy Day Fund + General Fund trajectory |
| 9 | Health Spending Grew Twice as Fast | MDH 10-year CAGR vs. all other agencies |
| 10 | The Legislature's $1.1B Response | JCR cuts breakdown |

Every slide has a source line and at least one clickable citation that opens the source PDF at the exact page.

`[SCREENSHOT: A typical two-column slide (e.g., Slide 5 — Structural Gap) showing the chart, commentary sidebar with source citation]`

`[SCREENSHOT: Slide 2 — Sankey at full width with title and one-line subtext above the chart]`

### 3.3 County Budget & Outcomes Map

A standalone D3 county choropleth embedded via iframe at the bottom of the home page. The map has two tabs:

- **Budget Map** — Choropleth of Maryland's 24 counties across four metrics (Budget, Poverty, Income, Population), with a year slider from FY2015 to FY2026 and an agency filter.
- **Efficiency Analysis** — MFR performance trends and agency-vs-spending scatter plots.

County allocations are modeled estimates from agency program distributions and Census data, and are labeled as such on the map.

`[SCREENSHOT: The county map with Maryland counties colored by budget allocation]`

### 3.4 Methodology page

Located at `/methodology`. Documents the cross-document reconciliation methodology, the input → magic box → output pipeline, NXT's five DNA pillars, the NIST AI RMF governance framework, the design decisions behind each of the six problems the tool solves, and the full list of source documents.

`[SCREENSHOT: The Methodology page hero and pipeline diagram]`

### 3.5 Guardrails page

Located at `/guardrails`. Lists the hard limits the tool will not cross (no invented data, no projections beyond FY2030, no political answers, no hidden uncertainty, no stripped context, no personalized actors) and the four commitments every release is held to.

`[SCREENSHOT: The Guardrails page hero and the hard-limits grid]`

---

## 4. Deep-Dive Features

The Deep-Dive lives at `/deep-dive/*` and provides agency- and program-level exploration of Maryland's budget across FY2017–FY2027.

### 4.1 Budget Office

`/deep-dive/budget-office` — the landing page of the Deep-Dive. High-level fiscal overview with:

- Fund composition (General / Special / Federal) over time
- Top agencies by budget with year-over-year trend lines
- Filterable agency table covering 80+ agencies across three fiscal years
- Click any agency row to drill into its dedicated page with program-level breakdown

`[SCREENSHOT: Deep-Dive Budget Office landing page]`

### 4.2 Technology

`/deep-dive/technology` — IT spend analysis classified into TBM v5.0.1 cost pools and IT towers. Shows:

- IT spend by agency
- IT tower composition over time (Compute, Network, Storage, Application Support, etc.)
- Agency-level IT drill-downs

Classification is performed by Claude-powered agents that map budget line items into TBM cost pools and IT towers. The classifier output is cached so the same input produces the same classification on every run.

`[SCREENSHOT: Deep-Dive Technology page with tower composition chart]`

### 4.3 Variance Analysis

`/deep-dive/variance-analysis` — year-over-year change detection. The user picks two fiscal years and a percentage threshold, and the page highlights agencies whose spending changed by more than the threshold. Shows top movers (up and down), new and eliminated programs, and shifts in fund composition.

`[SCREENSHOT: Variance Analysis page showing top movers]`

### 4.4 Anomaly Detection

`/deep-dive/anomaly-detection` — statistical outlier identification. Flags spending spikes and drops above a configurable standard-deviation threshold. Covers 386 detected anomalies across 72 affected agencies in the current dataset.

`[SCREENSHOT: Anomaly Detection page with flagged outliers]`

### 4.5 IT Development Projects (MITDP)

`/deep-dive/it-projects` — explorer for Maryland's IT development projects from the MITDP register. Each project has a dedicated page with funding trend, milestone status, and budget composition.

`[SCREENSHOT: IT Projects landing page]`

---

## 5. Data Sources

All data on the home page comes from four official Maryland government publication types. No third-party estimates or news figures appear on the dashboard.

| Document | Years used | Anchors |
|---|---|---|
| ACFR (Annual Comprehensive Financial Report) | 2023–2025 | Reserve balances, federal exposure, MDH spending, Blueprint baseline, structural gap |
| JCR (Joint Chairmen's Report) | 2025 | Agency cuts, Commerce cut, Blueprint legislative analysis |
| MFR (Monthly Fiscal Report) | 2015–2026 | Executive in-year tracking, agency performance |
| DBM Operating Budget Books | FY2026, FY2027 | Proposed budget, fund allocations, deficiency schedule |

The Deep-Dive additionally pulls from:

- The DBM open data portal (live agency-level appropriations API)
- State aid to local governments disclosure files
- The MITDP project register

---

## 6. Setting Up the Home Page Locally

This section walks through running the home page on your own computer from scratch.

### 6.1 What you need installed

| Tool | Version | Where to get it |
|---|---|---|
| Node.js | 20 or newer | https://nodejs.org |
| Git | any recent version | https://git-scm.com |
| A code editor | VS Code recommended | https://code.visualstudio.com |
| A terminal | Built into your OS | Terminal (macOS), PowerShell (Windows), bash (Linux) |

To check your Node version:

```bash
node --version
```

If the number starts with `v20` or higher, you are good. If not, install or upgrade from https://nodejs.org.

### 6.2 Clone the repository

```bash
git clone https://github.com/asingh3506/md-budget-site.git
cd md-budget-site
```

### 6.3 Install dependencies

```bash
npm install
```

This downloads the JavaScript packages the project needs. It takes 1–3 minutes the first time. You only need to run it once per clone, or after a `git pull` that changed `package.json`.

### 6.4 Start the development server

```bash
npm run dev
```

When you see a message like `Ready in 1.2s`, open your web browser and go to:

> http://localhost:3000

You should see the full home page with KPI cards, the carousel, the county map, methodology, and guardrails.

`[SCREENSHOT: The terminal showing 'Ready in 1.2s' and a browser opened to localhost:3000]`

### 6.5 Build for production

When you want to verify your changes work in the production-ready output:

```bash
npm run build
```

If the build succeeds, you'll see a route listing like:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /guardrails
└ ○ /methodology
```

To serve that build locally:

```bash
npm run start
```

### 6.6 Where to make changes

| If you want to change… | Edit this file |
|---|---|
| The KPI cards | `components/KpiRow.tsx` (the `CARDS` array) |
| The carousel slides | `components/Carousel.tsx` (the `SLIDES` array) |
| The ticker headlines | `app/page.tsx` (the `TICKER` array) |
| The Methodology page | `app/methodology/page.tsx` |
| The Guardrails page | `app/guardrails/page.tsx` |
| The header / nav | `components/Header.tsx` |
| Theme colors and tokens | `app/globals.css` (CSS variables in `:root`) |
| A specific chart | `components/charts/<ChartName>.tsx` |

After saving, the dev server reloads automatically. No restart needed.

---

## 7. Setting Up the Deep-Dive Locally

The Deep-Dive lives in a separate repository. It has its own data pipeline, database, and frontend. You only need to set this up if you are refreshing the data or modifying Deep-Dive pages.

> **Note.** The home page repository already includes the pre-built Deep-Dive HTML under `public/deep-dive/`. If you are not changing Deep-Dive content, you do not need to run this section — the static build is already deployed.

### 7.1 What you need installed

| Tool | Version | Where to get it |
|---|---|---|
| Python | 3.10 or newer | https://www.python.org |
| Node.js | 18 or newer | https://nodejs.org |
| Anthropic API key | Active | https://console.anthropic.com |

The API key is only required when re-running the AI classification pipeline (cost-pool mapping and IT tower classification). The classification output is cached in CSV, so the key is not needed every time you rebuild Evidence.

### 7.2 Clone the repository

```bash
git clone https://github.com/priyanshu124/IT_state_budget_agent.git
cd IT_state_budget_agent
```

### 7.3 Set up the Python environment

The easy way:

```bash
bash setup.sh
```

Or step-by-step:

```bash
python3 -m venv venv
source venv/bin/activate            # On Windows PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 7.4 Add your API key (only if running classification)

Create a file named `.env` in the repository root with this content:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

Do not commit this file. It is already in `.gitignore`.

### 7.5 Ingest raw data into DuckDB

```bash
python load_data.py
```

This reads the source budget files and writes them to `dbt-sql/mbtsa_work.duckdb`. Re-run any time the raw data is refreshed.

### 7.6 Run DBT transformations

```bash
cd dbt-sql
dbt run
cd ..
```

This rebuilds the analytical marts. The most important downstream table is `main_marts.fct_it_spend` — the fact table every Deep-Dive chart ultimately joins against.

### 7.7 (Optional) Re-run AI classification

If new programs were added to the source data, re-run the cost pool mapper and tower classifier. Skip this step if you have not changed the source data.

```bash
python -m src.agents.cost_pool_mapper
python -m src.agents.tower_classifier
```

This step consumes Anthropic API tokens. The cached classifications live in `data/output/cost_pool_mappings.csv`.

### 7.8 Build the Evidence dashboard

```bash
cd dashboard
npm install                      # only the first time
npm run dev                      # to preview locally → http://localhost:3000
npm run build                    # to produce the static bundle
```

The static bundle ends up in `dashboard/build/`.

### 7.9 Publish the Deep-Dive to the home page

The home page repository expects the Deep-Dive's built output at `public/deep-dive/`. To update it:

```bash
# from the IT_state_budget_agent repo, after npm run build
rm -rf <path-to>/md-budget-site/public/deep-dive
cp -r dashboard/build <path-to>/md-budget-site/public/deep-dive
```

Then commit the change in the home-page repo and push. Netlify will rebuild and the new Deep-Dive will be live within a couple of minutes.

`[SCREENSHOT: The local Deep-Dive running at http://localhost:3000/budget-office]`

---

## 8. Updating the Live Site

The live site is deployed on Netlify and is configured to rebuild automatically on every push to `master` in the home-page repository.

### 8.1 Update the home page

```bash
# in the md-budget-site repository
git checkout master
# … make your changes …
npm run build                      # sanity check
git add -A
git commit -m "describe what changed"
git push origin master
```

Netlify will detect the push, run `npm run build`, and publish within 1–3 minutes. You can watch the build live at https://app.netlify.com.

### 8.2 Update the Deep-Dive

```bash
# in the IT_state_budget_agent repository
# … make your changes …
cd dashboard
npm run build
# Copy build into md-budget-site/public/deep-dive (see 7.9)
cd <path-to>/md-budget-site
git add public/deep-dive
git commit -m "deep-dive: describe what changed"
git push origin master
```

Same as 8.1 from this point: Netlify rebuilds, the new Deep-Dive ships.

### 8.3 Refresh the data for a new fiscal year

When the FY2028 budget drops:

1. **Home page numbers**: edit `components/KpiRow.tsx`, `components/Carousel.tsx`, `app/page.tsx` (the ticker), `app/layout.tsx` (the footer), and any chart components whose data is hardcoded.
2. **Deep-Dive data**: load the new fiscal year's CSVs via `python load_data.py`, re-run DBT, optionally re-run AI classification for new programs, rebuild Evidence, and publish (see 7.9).
3. **Source PDFs**: update the citation tables on the Methodology page (`app/methodology/page.tsx`) if any new source documents are added.

A grep for the current fiscal year (e.g. `grep -rn "FY2027" components app`) is the quickest way to find every hardcoded reference.

---

## 9. Future Scope

### 9.1 Deploying on a custom domain (GoDaddy or similar registrar)

The site currently runs at `mdbudgetintel.netlify.app` (a Netlify subdomain). To deploy on an organization-owned domain, the following one-time setup is required:

#### Step 1 — Buy a domain
Purchase the desired domain at GoDaddy, Namecheap, Google Domains, or any registrar. Example: `marylandbudgetintel.com`.

#### Step 2 — Tell Netlify to expect it
1. Open https://app.netlify.com and select the MBIT site.
2. Click **Site configuration → Domains → Add a domain**.
3. Enter your domain name (e.g. `marylandbudgetintel.com`) and click **Verify**.
4. Netlify will display the DNS records you need to add at your registrar.

#### Step 3 — Update DNS at your registrar
In your registrar's DNS panel:

- Add an **A record**: Host = `@`, Value = `75.2.60.5` (Netlify's load balancer IP)
- Add a **CNAME record**: Host = `www`, Value = `<your-site>.netlify.app`

(The exact IP and target may differ; always copy from what Netlify shows you in step 2.)

#### Step 4 — Wait and verify
DNS propagation takes 10 minutes to 24 hours, typically under an hour. Once Netlify shows a green checkmark next to your domain, the site is live on the new domain.

#### Step 5 — Turn on HTTPS
In **Site configuration → Domains → HTTPS**, click **Provision certificate**. Netlify uses Let's Encrypt; it is free and renews automatically. Within a few minutes, `https://` will work and HTTP traffic will redirect to HTTPS.

#### Step 6 — Set the primary domain
Designate the custom domain as the primary in the same Domains panel. Old `mdbudgetintel.netlify.app` URLs will permanently redirect to it.

No code changes are needed on either application side. Both the home page and the Deep-Dive continue to work because they use relative URLs.

#### Alternative: deploying under an existing organization domain
If publishing under an existing umbrella (for example `budget.maryland.gov` or `budget.nxt.com`), coordinate with the domain administrator to add a CNAME record pointing to `<your-site>.netlify.app`. The remaining steps (4–6) are identical.

### 9.2 Feature improvements

- **Automated data refresh.** A scheduled GitHub Action that pulls the DBM open data portal, runs DBT, rebuilds Evidence, and opens a PR with the refreshed bundle.
- **PDF export per chart.** A "Download as PNG" or "Export as PDF" button on each carousel slide.
- **Shareable chart links.** Anchor URLs like `/#chart-7` that scroll to a specific carousel slide.
- **Peer-state benchmarking.** Add Virginia, Pennsylvania, and North Carolina to the carousel for cross-state context.
- **Subscriber alerts.** RSS or email notifications when a new ACFR / JCR / DBM document is published.
- **Bond rating context.** Add Maryland's AAA credit rating and outlook as a KPI for fiscal-health context.
- **Executive PDF brief.** A one-page printable summary generator for legislative offices.
- **CI/CD pipeline.** GitHub Actions for lint, type-check, and build-on-PR.
- **Production monitoring.** Sentry for error tracking, Plausible or PostHog for analytics.

### 9.3 Architectural improvements

- **Move the Deep-Dive build into the main repo's CI.** Right now the Deep-Dive is built by hand and the output is committed. The simplest improvement is a GitHub Action in the home-page repo that runs `dashboard/npm run build` before deploy.
- **Pin the Claude model.** The classification scripts read `CLAUDE_MODEL` from the environment. Pin a specific model version in `requirements.txt` or a config file so classification stays reproducible even if Anthropic deprecates a model alias.
- **Test the classification output.** Add a small held-out test set of program → tower mappings and assert the classifier reproduces them. Wire into the deploy gate.

---

## 10. Known Limitations

- **County allocations are modeled.** The county map uses program-share-of-population modeling on Census data, not direct county-level audited spending (which is not published by Maryland). Modeled values are labeled.
- **Home-page projections stop at FY2030.** The structural-gap projection uses a linear slope from FY2023–FY2025 audited actuals. This is a trajectory, not a forecast.
- **AI classification consumes API tokens.** Re-running the cost-pool mapper or tower classifier from scratch on the full dataset takes hundreds of Claude calls. Caching is in place; an invalid API key will halt the pipeline.
- **DBT marts depend on input schema.** If `load_data.py`'s input CSV columns change, downstream DBT models may need updates. The dashboard's column references must match.
- **No authenticated users.** The site is fully public. There is no user account system, no usage tracking, and no rate limiting.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| ACFR | Annual Comprehensive Financial Report — Maryland's audited financial statements, published yearly by the Comptroller. |
| Anomaly | A spending value (year-over-year change) that exceeds the statistical-deviation threshold configured in the Deep-Dive. |
| Blueprint | The Blueprint for Maryland's Future — the 2021 state law mandating K-12 education funding levels. |
| Capstone | The final integrative project of the iSchool master's program. |
| CAGR | Compound annual growth rate. |
| Carousel | The horizontal scrolling strip of ten chart slides on the home page. |
| Citation | A clickable source link on every chart that opens the source PDF at the exact page. |
| Cost pool / Tower | TBM v5.0.1 budget categorizations used by the Deep-Dive Technology page. |
| Choropleth | A map where regions are shaded by a value (used for the county map). |
| DBM | Maryland Department of Budget and Management — the state's executive budget office. |
| DBT | Data Build Tool — the framework used to transform DuckDB raw tables into analytical marts. |
| Deep-Dive | The Evidence-based agency drill-down dashboard at `/deep-dive/*`. |
| DuckDB | An in-process analytical database; the Deep-Dive's warehouse runs in a single `.duckdb` file. |
| Evidence | https://evidence.dev — the SvelteKit framework used to build the Deep-Dive's static pages. |
| Federal Funds | One of three Maryland fund types. The other two are General Funds and Special Funds. |
| Fiscal year (FY) | Maryland's fiscal year runs July 1 to June 30. FY2027 starts July 1, 2026. |
| General Fund | The state's primary discretionary spending account. |
| Iframe | An HTML element that embeds another page inside the current page. Used by the Sankey, Fiscal Journey, and county map. |
| JCR | Joint Chairmen's Report — the General Assembly's annual legislative analysis of the budget. |
| KPI | Key Performance Indicator — the six summary cards at the top of the home page. |
| MITDP | Major Information Technology Development Project — Maryland's registry of large IT initiatives. |
| MFR | Monthly Fiscal Report — the executive branch's in-year fiscal tracking publication. |
| Netlify | The static-site host this project runs on. |
| Next.js | The React framework powering the home page (`app/page.tsx`, `app/methodology/page.tsx`, etc.). |
| NIST AI RMF | NIST AI Risk Management Framework — the federal governance framework applied to the tool's design. |
| NXT | The capstone industry partner; their five-pillar values framework informs the dashboard's editorial approach. |
| Plotly | The charting library used for most home-page visualizations. |
| Sankey | The flow diagram on Slide 2 showing Revenue → Fund Type → Agency (and optionally → Programs). |
| Special Funds | Restricted-purpose state revenues (tolls, fees, dedicated taxes). |
| TBM v5.0.1 | Technology Business Management taxonomy — the framework used to classify IT spend. |

---

## 12. Contributors and Contact

This project was built by the University of Maryland iSchool capstone team in partnership with NXT and the Senate Budget and Taxation Committee staff.

| Name | Role |
|---|---|
| Aarushi Singh | Home Page lead, frontend, Netlify deploy |
| Nadvi Haque | Home Page contributor, design, citation system |
| Priyanshu Gupta | Deep-Dive lead, Python pipeline, Evidence dashboard, AI classification |
| James Van Doorn | Home Page contributor, analysis, narrative |

For questions about continuing the project, open an issue in the relevant GitHub repository:

- Home page: https://github.com/asingh3506/md-budget-site/issues
- Deep-Dive: https://github.com/priyanshu124/IT_state_budget_agent/issues

---

*End of document.*
