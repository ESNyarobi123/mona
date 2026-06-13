import type { PackingSheet, ProcurementReport, RouteReport } from "./market-types";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BASE_STYLE = `
  body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  .meta { color: #555; font-size: 0.875rem; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f5f5f5; }
  .check { width: 28px; text-align: center; font-size: 1.1rem; }
  @media print { body { margin: 12px; } }
`;

export function procurementToHtml(report: ProcurementReport, title = "Ripoti ya Ununuzi") {
  const rows = report.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.name)}</td><td>${esc(l.unit)}</td><td><strong>${l.totalQuantity}</strong></td><td>${l.orderCount}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${BASE_STYLE}</style></head><body>
<h1>${esc(title)}</h1>
<p class="meta">Utoaji: ${esc(report.deliveryDate)} · Oda ${report.summary.totalOrders} · Wateja ${report.summary.totalCustomers}</p>
<table><thead><tr><th>Bidhaa</th><th>Kipimo</th><th>Jumla</th><th>Oda</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>Hakuna bidhaa</td></tr>"}</tbody></table>
</body></html>`;
}

export function packingSheetToHtml(sheet: PackingSheet, deliveryDate: string) {
  const rows = sheet.lines
    .map(
      (l) =>
        `<tr><td class="check">${l.checked ? "☑" : "☐"}</td><td>${esc(l.name)}</td><td>${l.quantity}</td><td>${esc(l.unit)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(sheet.orderRef)}</title><style>${BASE_STYLE}</style></head><body>
<h1>Checklist — ${esc(sheet.orderRef)}</h1>
<p class="meta">${esc(sheet.customer.name ?? sheet.customer.phone)} · ${esc(sheet.address)}<br/>Utoaji: ${esc(deliveryDate)}${sheet.zoneName ? ` · ${esc(sheet.zoneName)}` : ""}</p>
<table><thead><tr><th></th><th>Bidhaa</th><th>Kiasi</th><th>Kipimo</th></tr></thead><tbody>${rows}</tbody></table>
<p class="meta">Jumla: ${sheet.total.toLocaleString()} TZS</p>
</body></html>`;
}

export function routesToHtml(report: RouteReport) {
  const sections: string[] = [];

  for (const group of report.groups) {
    const stops = group.stops
      .map(
        (s) =>
          `<tr><td>${s.sequence}</td><td>${esc(s.customer.name ?? s.customer.phone)}</td><td>${esc(s.address)}</td><td>${s.itemCount}</td><td>${s.orderRef}</td></tr>`
      )
      .join("");
    sections.push(`<h2>${esc(group.zoneName)}</h2><table><thead><tr><th>#</th><th>Mteja</th><th>Anwani</th><th>Vitu</th><th>Oda</th></tr></thead><tbody>${stops}</tbody></table>`);
  }

  if (report.unassigned.length) {
    const stops = report.unassigned
      .map(
        (s) =>
          `<tr><td>${s.sequence}</td><td>${esc(s.customer.name ?? s.customer.phone)}</td><td>${esc(s.address)}</td><td>${s.itemCount}</td><td>${s.orderRef}</td></tr>`
      )
      .join("");
    sections.push(`<h2>Haijapangwa (hakuna eneo)</h2><table><thead><tr><th>#</th><th>Mteja</th><th>Anwani</th><th>Vitu</th><th>Oda</th></tr></thead><tbody>${stops}</tbody></table>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Ripoti ya Usafirishaji</title><style>${BASE_STYLE} h2 { font-size: 1rem; margin-top: 24px; }</style></head><body>
<h1>Ripoti ya Usafirishaji</h1>
<p class="meta">Utoaji: ${esc(report.deliveryDate)} · Stops ${report.summary.totalStops}</p>
${sections.join("") || "<p>Hakuna oda</p>"}
</body></html>`;
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
  const header = "zone,sequence,customer,phone,address,items,order_ref,total";
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
        s.itemCount,
        s.orderRef,
        s.total,
      ].join(",")
    );
  }
  return [header, ...rows].join("\n");
}
