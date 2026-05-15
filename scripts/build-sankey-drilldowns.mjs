#!/usr/bin/env node
/**
 * Pre-process Sankey_Data.xlsx → public/sankey_drilldowns.json
 * Run when the source xlsx changes:  node scripts/build-sankey-drilldowns.mjs
 *
 * Mirrors the Python notebook (Cell 7) drill-down construction so the chart
 * doesn't have to ship the xlsx parser to the browser.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TOP_AGENCIES = [
  "MD Dept of Health", "Aid To Education", "Transportation (MDOT)",
  "Dept of Human Services", "Public Safety & Corrections",
  "Higher Education (Other)", "Judiciary", "State Reserve Fund",
  "Housing & Comm Dev", "Maryland Health Benefit Exchange",
  "Labor", "State Police", "Environment", "Natural Resources",
  "State Department of Education", "Budget & Management", "Commerce",
  "Department of Information Technology", "Comptroller of Maryland",
  "General Services", "Agriculture", "Office of the Attorney General",
  "Military Department",
];

function assignAgency(name, budget) {
  const p = String(name).toLowerCase().trim();
  const inc = (arr) => arr.some((k) => p.includes(k));
  if (inc([
    "medical care provider","medicaid behavioral health","reinsurance program",
    "maryland children's health","family health and chronic",
    "infectious disease and environmental","health services cost review",
    "spring grove hospital","springfield hospital","clifton t. perkins",
    "thomas b. finan","eastern shore hospital","maryland health care commission",
    "community services for medicaid","maryland community health resources",
    "office of preparedness","core public health",
    "benefits management and provider","maryland health benefit exchange",
    "office of enterprise technology - medicaid","office of health care quality",
    "health professional boards","mdh hospital","office of population health",
    "deputy secretary for health care financing","medicaid fraud control",
    "behavioral health administration","md behavioral health",
    "office of the inspector general for health","laboratory services",
  ])) return "MD Dept of Health";
  if (p === "community services" && budget > 1_000_000_000) return "MD Dept of Health";
  if (inc([
    "state share of foundation","compensatory education",
    "aid for local employee fringe","students with disabilities",
    "limited english proficient","food services program",
    "concentration of poverty","county and municipality funds",
    "educationally deprived","assistance to state for educating",
    "disparity grants","education effort adjustment","educational excellence",
    "prekindergarten","supplemental public school construction",
    "teacher development","state superintendent","division of early childhood",
    "blueprint for maryland","guaranteed tax base","aid to libraries",
    "non-public school health","local law enforcement grants",
    "aid to community colleges - fringe",
  ])) return "Aid To Education";
  if (inc([
    "support for state operated institutions of higher education",
    "senator john a. cade funding formula","joseph a. sellinger formula",
    "aid to community colleges",
  ])) return "Higher Education (Other)";
  if (inc([
    "state system construction","bus operations","washington metropolitan area transit",
    "port facilities and capital","port operations","rail operations","airport operations",
    "airport facilities","motor vehicle operations","transit administration",
    "state system maintenance","washington metropolitan area transit-capital",
  ])) return "Transportation (MDOT)";
  if ((p === "transportation" || p === "facilities and capital equipment") && budget > 300_000_000)
    return "Transportation (MDOT)";
  if (inc([
    "assistance payments","child care assistance","foster care maintenance",
    "office of home energy","child welfare services","local family investment",
    "rental services programs","maryland office for refugees",
    "child support administration","adult services","office of unemployment insurance",
    "division of rehabilitation","division of paid leave","veterans home program",
  ])) return "Dept of Human Services";
  if (p === "community services" && budget < 700_000_000) return "Dept of Human Services";
  if (inc([
    "correctional institution","correctional center","correctional facility",
    "correctional training","correctional enterprises","maryland correctional",
    "metropolitan transition","dorsey run","patuxent institution",
    "chesapeake detention","roxbury correctional","north branch correctional",
    "western correctional","jessup correctional","eastern correctional",
    "parole and probation","juvenile services","adult corrections",
    "field operations bureau","criminal investigation bureau",
    "support services bureau","district operations","state aid for police protection",
    "baltimore central booking","baltimore city correctional","central maryland correctional",
    "facility operations administration","general administration and hearings",
    "maryland department of emergency management","local law enforcement",
  ])) return "Public Safety & Corrections";
  if (inc([
    "clerks of the circuit court","administrative office of the courts",
    "circuit court judges","judicial information systems",
    "supreme court of maryland","appellate court of maryland",
  ])) return "Judiciary";
  if (inc([
    "redemption and interest on state bonds","debt service requirements",
  ])) return "State Reserve Fund";
  if (inc([
    "water quality revolving","drinking water revolving","renewable and clean energy",
    "watershed and climate","water and science administration",
    "outdoor recreation land","bay restoration","chesapeake","natural resources",
  ])) return "Natural Resources";
  return null;
}

function cleanBudget(raw) {
  if (raw == null) return NaN;
  if (typeof raw === "number") return raw;
  const s = String(raw).replace(/\$/g, "").replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

async function main() {
  const buf = await readFile(join(ROOT, "public", "Sankey_Data.xlsx"));
  const wb = XLSX.read(buf, { type: "buffer" });

  // Find the sheet that has Program + Budget columns
  let progSheet = null;
  for (const name of wb.SheetNames) {
    const sh = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sh, { defval: null });
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]).map((c) => c.toLowerCase().trim());
    if (cols.includes("program") && cols.includes("budget")) {
      progSheet = rows;
      break;
    }
  }
  if (!progSheet) throw new Error("No sheet with Program + Budget columns found.");

  // Normalize the Fiscal Year column
  const fyKey = Object.keys(progSheet[0]).find((c) => /fiscal|^fy$|^year$/i.test(c)) || "Fiscal Year";

  const out = {};
  for (const year of [2025, 2026, 2027]) {
    out[year] = {};
    const yearRows = progSheet
      .filter((r) => Number(r[fyKey]) === year)
      .map((r) => ({ program: r["Program"], budget: cleanBudget(r["Budget"]) }))
      .filter((r) => Number.isFinite(r.budget) && r.budget >= 1_000_000);

    for (const ag of TOP_AGENCIES) {
      const sub = yearRows
        .map((r) => ({ ...r, agency: assignAgency(r.program, r.budget) }))
        .filter((r) => r.agency === ag)
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 20);
      if (sub.length === 0) continue;
      out[year][ag] = {
        count: sub.length,
        names: sub.map((r) => r.program),
        vals: sub.map((r) => Math.round(r.budget)),
        total: sub.reduce((s, r) => s + Math.round(r.budget), 0),
      };
    }
  }

  const outPath = join(ROOT, "public", "sankey_drilldowns.json");
  await writeFile(outPath, JSON.stringify(out));
  const summary = Object.fromEntries(
    Object.entries(out).map(([y, m]) => [y, Object.keys(m).length + " agencies"])
  );
  console.log("✓ Wrote", outPath);
  console.log("  ", JSON.stringify(summary));
}

main().catch((e) => { console.error(e); process.exit(1); });
