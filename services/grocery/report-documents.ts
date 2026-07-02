import type { PackingSheet, ProcurementReport, RouteReport } from "./market-types";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND = {
  navy: "#1b2845",
  navyLight: "#2a3f66",
  orange: "#ff6b2c",
  orangeDark: "#e85a1a",
  cream: "#f8f6f3",
  border: "#e2e8f0",
  muted: "#64748b",
};

const REPORT_STYLE = `
  :root {
    --navy: ${BRAND.navy};
    --navy-light: ${BRAND.navyLight};
    --orange: ${BRAND.orange};
    --orange-dark: ${BRAND.orangeDark};
    --cream: ${BRAND.cream};
    --border: ${BRAND.border};
    --muted: ${BRAND.muted};
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 28px;
    color: var(--navy);
    background: #fff;
    line-height: 1.45;
  }
  .report {
    max-width: 920px;
    margin: 0 auto;
  }
  .report__brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    margin-bottom: 1.25rem;
    border-bottom: 3px solid var(--orange);
  }
  .report__brand h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.02em;
  }
  .report__brand small {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--orange-dark);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .report__badge {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--orange), var(--orange-dark));
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .report__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin: 0 0 1.25rem;
    font-size: 0.875rem;
    color: var(--muted);
  }
  .report__meta strong { color: var(--navy); }
  .report__card {
    background: var(--cream);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem 1.1rem;
    margin-bottom: 1.25rem;
  }
  .report__card-label {
    margin: 0 0 0.35rem;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--navy-light);
  }
  .report__card p {
    margin: 0;
    font-size: 0.92rem;
    color: var(--navy);
  }
  .report__card + .report__card { margin-top: 0.65rem; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  th, td {
    border-bottom: 1px solid var(--border);
    padding: 0.65rem 0.85rem;
    text-align: left;
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }
  th {
    background: var(--navy);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  tbody tr:nth-child(even) { background: rgba(27, 40, 69, 0.03); }
  .check {
    width: 2.25rem;
    text-align: center;
    font-size: 1.05rem;
    color: var(--orange-dark);
  }
  .report__total {
    margin: 1rem 0 0;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(255, 107, 44, 0.12), rgba(27, 40, 69, 0.06));
    font-weight: 700;
    color: var(--navy);
  }
  h2 {
    font-size: 1rem;
    margin: 1.5rem 0 0.65rem;
    color: var(--navy-light);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  h2::before {
    content: "";
    width: 4px;
    height: 1.1em;
    border-radius: 2px;
    background: var(--orange);
  }
  .report__footer {
    margin-top: 1.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--muted);
    text-align: center;
  }
  @media print {
    body { padding: 12px; }
    .report__brand { break-after: avoid; }
    table { break-inside: avoid; }
  }
`;

function reportShell(title: string, badge: string, metaHtml: string, bodyHtml: string) {
  return `<!DOCTYPE html><html lang="sw"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${REPORT_STYLE}</style></head><body>
<div class="report">
  <header class="report__brand">
    <div>
      <h1>Monana Market</h1>
      <small>${esc(title)}</small>
    </div>
    <span class="report__badge">${esc(badge)}</span>
  </header>
  ${metaHtml}
  ${bodyHtml}
  <p class="report__footer">Monana · Ripoti ya utoaji</p>
</div>
</body></html>`;
}

function deliveryCards(address: string, note: string | null) {
  const blocks = [
    `<div class="report__card"><p class="report__card-label">Anwani ya kufikishia</p><p>${esc(address)}</p></div>`,
  ];
  if (note) {
    blocks.push(
      `<div class="report__card"><p class="report__card-label">Maelezo ya ziada</p><p>${esc(note)}</p></div>`
    );
  }
  return blocks.join("");
}

export function procurementToHtml(report: ProcurementReport, title = "Ripoti ya Ununuzi") {
  const rows = report.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.name)}</td><td>${esc(l.unit)}</td><td><strong>${l.totalQuantity}</strong></td><td>${l.orderCount}</td></tr>`
    )
    .join("");

  const meta = `<div class="report__meta">
    <span><strong>Utoaji:</strong> ${esc(report.deliveryDate)}</span>
    <span><strong>Oda:</strong> ${report.summary.totalOrders}</span>
    <span><strong>Wateja:</strong> ${report.summary.totalCustomers}</span>
    <span><strong>SKU:</strong> ${report.summary.totalSkus}</span>
  </div>`;

  const body = `<table><thead><tr><th>Bidhaa</th><th>Kipimo</th><th>Jumla</th><th>Oda</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>Hakuna bidhaa</td></tr>"}</tbody></table>`;

  return reportShell(title, "Ununuzi", meta, body);
}

export function packingSheetToHtml(sheet: PackingSheet, deliveryDate: string) {
  const rows = sheet.lines
    .map(
      (l) =>
        `<tr><td class="check">${l.checked ? "☑" : "☐"}</td><td>${esc(l.name)}</td><td>${l.quantity}</td><td>${esc(l.unit)}</td></tr>`
    )
    .join("");

  const meta = `<div class="report__meta">
    <span><strong>Oda:</strong> ${esc(sheet.orderRef)}</span>
    <span><strong>Mteja:</strong> ${esc(sheet.customer.name ?? sheet.customer.phone)}</span>
    <span><strong>Utoaji:</strong> ${esc(deliveryDate)}</span>
    ${sheet.zoneName ? `<span><strong>Eneo:</strong> ${esc(sheet.zoneName)}</span>` : ""}
  </div>
  ${deliveryCards(sheet.address, sheet.note)}`;

  const body = `<table><thead><tr><th></th><th>Bidhaa</th><th>Kiasi</th><th>Kipimo</th></tr></thead><tbody>${rows}</tbody></table>
<p class="report__total">Jumla: ${sheet.total.toLocaleString()} TZS</p>`;

  return reportShell(`Checklist ${sheet.orderRef}`, "Pakiti", meta, body);
}

export function routesToHtml(report: RouteReport) {
  const sections: string[] = [];

  for (const group of report.groups) {
    const stops = group.stops
      .map(
        (s) =>
          `<tr><td>${s.sequence}</td><td>${esc(s.customer.name ?? s.customer.phone)}</td><td>${esc(s.address)}${s.note ? `<br/><small style="color:var(--muted)"><strong>Maelezo:</strong> ${esc(s.note)}</small>` : ""}</td><td>${s.itemCount}</td><td>${s.orderRef}</td></tr>`
      )
      .join("");
    sections.push(
      `<h2>${esc(group.zoneName)}</h2><table><thead><tr><th>#</th><th>Mteja</th><th>Anwani &amp; maelezo</th><th>Vitu</th><th>Oda</th></tr></thead><tbody>${stops}</tbody></table>`
    );
  }

  if (report.unassigned.length) {
    const stops = report.unassigned
      .map(
        (s) =>
          `<tr><td>${s.sequence}</td><td>${esc(s.customer.name ?? s.customer.phone)}</td><td>${esc(s.address)}${s.note ? `<br/><small style="color:var(--muted)"><strong>Maelezo:</strong> ${esc(s.note)}</small>` : ""}</td><td>${s.itemCount}</td><td>${s.orderRef}</td></tr>`
      )
      .join("");
    sections.push(
      `<h2>Haijapangwa (hakuna eneo)</h2><table><thead><tr><th>#</th><th>Mteja</th><th>Anwani &amp; maelezo</th><th>Vitu</th><th>Oda</th></tr></thead><tbody>${stops}</tbody></table>`
    );
  }

  const meta = `<div class="report__meta">
    <span><strong>Utoaji:</strong> ${esc(report.deliveryDate)}</span>
    <span><strong>Stops:</strong> ${report.summary.totalStops}</span>
    <span><strong>Maeneo:</strong> ${report.summary.zoneCount}</span>
    ${report.summary.unassignedCount ? `<span><strong>Haijapangwa:</strong> ${report.summary.unassignedCount}</span>` : ""}
  </div>`;

  return reportShell("Ripoti ya Usafirishaji", "Usafiri", meta, sections.join("") || "<p>Hakuna oda</p>");
}

export function procurementToCsv(report: ProcurementReport) {
  const header = "product,name,unit,total_quantity,order_count";
  const rows = report.lines.map((l) =>
    [l.productId ?? "", csvCell(l.name), l.unit, l.totalQuantity, l.orderCount].join(",")
  );
  return [header, ...rows].join("\n");
}

function csvCell(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function routesToCsv(report: RouteReport) {
  const header = "zone,sequence,customer,phone,address,extra_details,items,order_ref,total";
  const rows: string[] = [];
  for (const g of report.groups) {
    for (const s of g.stops) {
      rows.push(
        [
          csvCell(g.zoneName),
          s.sequence,
          csvCell(s.customer.name ?? ""),
          s.customer.phone,
          csvCell(s.address),
          csvCell(s.note ?? ""),
          s.itemCount,
          s.orderRef,
          s.total,
        ].join(",")
      );
    }
  }
  for (const s of report.unassigned) {
    rows.push(
      [
        "UNASSIGNED",
        s.sequence,
        csvCell(s.customer.name ?? ""),
        s.customer.phone,
        csvCell(s.address),
        csvCell(s.note ?? ""),
        s.itemCount,
        s.orderRef,
        s.total,
      ].join(",")
    );
  }
  return [header, ...rows].join("\n");
}
