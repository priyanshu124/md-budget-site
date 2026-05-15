"use client";
import dynamic from "next/dynamic";
import ChartFrame from "./ChartFrame";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ACFR 2025 · Statistical Section · pp.231-233 (PDF p.247)
// Changes in Fund Balances, Governmental Funds, Last Ten Fiscal Years (audited)
const yrs = ["FY2016","FY2017","FY2018","FY2019","FY2020","FY2021","FY2022","FY2023","FY2024","FY2025"];
const rev = [33.8, 34.8, 35.7, 38.2, 40.4, 48.3, 56.7, 53.0, 55.6, 55.4];
const exp = [36.2, 38.1, 38.4, 40.1, 43.0, 48.4, 53.9, 54.5, 57.8, 62.1];

// Linear regression slope (numpy.polyfit deg 1) on FY2023→FY2025
function slopeFromLastThree(values: number[]): number {
  const x = [2023, 2024, 2025];
  const y = values.slice(-3);
  const mx = (x[0] + x[1] + x[2]) / 3;
  const my = (y[0] + y[1] + y[2]) / 3;
  const num = (x[0]-mx)*(y[0]-my) + (x[1]-mx)*(y[1]-my) + (x[2]-mx)*(y[2]-my);
  const den = (x[0]-mx)**2 + (x[1]-mx)**2 + (x[2]-mx)**2;
  return num / den;
}
const revSlope = slopeFromLastThree(rev);  // 1.2
const expSlope = slopeFromLastThree(exp);  // 3.8

// Project FY2025 → FY2030 along the slope
const projYrs = ["FY2025","FY2026","FY2027","FY2028","FY2029","FY2030"];
const projRev = projYrs.map((_, i) => +(rev[rev.length - 1] + revSlope * i).toFixed(1));
const projExp = projYrs.map((_, i) => +(exp[exp.length - 1] + expSlope * i).toFixed(1));

const gap = yrs.map((_, i) => +(rev[i] - exp[i]).toFixed(1));
const projGap = projYrs.map((_, i) => +(projRev[i] - projExp[i]).toFixed(1));
const finalGap = projGap[projGap.length - 1];  // FY2030

export default function StructuralGapChart() {
  return (
    <ChartFrame
      title={`Spending Is Growing ${(expSlope / revSlope).toFixed(1)}x Faster Than Revenue`}
      deck={`Post-ARPA: expenditures +$${expSlope.toFixed(1)}B/yr vs. revenue +$${revSlope.toFixed(1)}B/yr; gap projected at -$${Math.abs(finalGap).toFixed(1)}B by FY2030`}
      source="ACFR 2025 · Statistical Section · pp.231-233 (PDF p.247) | Changes in Fund Balances, Governmental Funds, Last Ten Fiscal Years (audited) | Projection: FY2023-2025 slope extended to FY2030"
    >
      <Plot
        data={[
          {
            x: yrs, y: rev,
            type: "scatter", mode: "lines+markers",
            name: "Revenue (actual)",
            line: { color: "#1A7340", width: 2.8 },
            marker: { size: 6, color: "#1A7340" },
            hovertemplate: "<b>%{x}</b><br>Revenue: $%{y:.1f}B<extra></extra>",
          },
          {
            x: yrs, y: exp,
            type: "scatter", mode: "lines+markers",
            name: "Expenditure (actual)",
            line: { color: "#C41230", width: 2.8 },
            marker: { size: 6, color: "#C41230" },
            fill: "tonexty",
            fillcolor: "rgba(196,18,48,0.08)",
            hovertemplate: "<b>%{x}</b><br>Expenditure: $%{y:.1f}B<extra></extra>",
          },
          {
            x: projYrs, y: projRev,
            type: "scatter", mode: "lines",
            name: "Revenue (projected)",
            line: { color: "#1A7340", width: 2, dash: "dash" },
            showlegend: false,
            hovertemplate: "<b>%{x}</b><br>Proj Rev: $%{y:.1f}B<extra></extra>",
          },
          {
            x: projYrs, y: projExp,
            type: "scatter", mode: "lines",
            name: "Expenditure (projected)",
            line: { color: "#C41230", width: 2, dash: "dash" },
            showlegend: false,
            hovertemplate: "<b>%{x}</b><br>Proj Exp: $%{y:.1f}B<extra></extra>",
          },
        ]}
        layout={{
          paper_bgcolor: "white",
          plot_bgcolor: "white",
          font: { family: "Georgia, serif", size: 11, color: "#121212" },
          margin: { t: 18, r: 20, b: 40, l: 60 },
          yaxis: {
            title: { text: "$ Billions" } as never,
            gridcolor: "#EFEFEF",
            tickformat: "$.0f",
            ticksuffix: "B",
          },
          xaxis: { showgrid: false },
          legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center" },
          hovermode: "x unified",
          shapes: [
            {
              type: "rect",
              xref: "x",
              yref: "paper",
              x0: "FY2020",
              x1: "FY2022",
              y0: 0,
              y1: 1,
              fillcolor: "rgba(196,130,10,0.08)",
              line: { width: 0 },
              layer: "below",
            },
          ],
          annotations: [
            {
              x: "FY2021",
              xref: "x",
              y: 1,
              yref: "paper",
              text: "ARPA federal aid",
              showarrow: false,
              font: { color: "#B8860B", size: 9, family: "Georgia, serif" },
              yanchor: "bottom",
            },
            {
              x: "FY2025", y: exp[exp.length - 1],
              text: `Gap: -$${Math.abs(gap[gap.length - 1]).toFixed(1)}B`,
              showarrow: true,
              arrowhead: 2,
              arrowcolor: "#C41230",
              font: { color: "#C41230", size: 11, family: "Georgia, serif" },
              ax: -60, ay: -20,
            },
            {
              x: "FY2030", y: projExp[projExp.length - 1],
              text: `Projected -$${Math.abs(finalGap).toFixed(1)}B`,
              showarrow: true,
              arrowhead: 2,
              arrowcolor: "#C41230",
              font: { color: "#C41230", size: 10, family: "Georgia, serif" },
              ax: -50, ay: -30,
            },
          ],
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 320 }}
      />

      {/* Surplus / Deficit bar strip */}
      <div style={{ marginTop: 4 }}>
        <Plot
          data={[
            {
              x: [...yrs, ...projYrs.slice(1)],
              y: [...gap, ...projGap.slice(1)],
              type: "bar",
              marker: {
                color: [...gap, ...projGap.slice(1)].map((v) =>
                  v >= 0 ? "#1A7340" : "#C41230"
                ),
                opacity: [...yrs.map(() => 1), ...projYrs.slice(1).map(() => 0.5)],
              },
              hovertemplate: "<b>%{x}</b><br>Gap: $%{y:.1f}B<extra></extra>",
            },
          ]}
          layout={{
            paper_bgcolor: "white",
            plot_bgcolor: "white",
            font: { family: "Georgia, serif", size: 10, color: "#121212" },
            margin: { t: 4, r: 20, b: 30, l: 60 },
            yaxis: {
              title: { text: "Surplus / Deficit" } as never,
              gridcolor: "#EFEFEF",
              tickformat: "$.0f",
              ticksuffix: "B",
              zeroline: true,
              zerolinecolor: "#121212",
            },
            xaxis: { showgrid: false, tickfont: { size: 9 } },
            showlegend: false,
            hovermode: "x unified",
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 120 }}
        />
      </div>
    </ChartFrame>
  );
}
