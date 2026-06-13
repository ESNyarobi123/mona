import {
  getMarketRunById,
  packingSheetToHtml,
  procurementToCsv,
  procurementToHtml,
  routesToCsv,
  routesToHtml,
  type PackingReport,
  type ProcurementReport,
  type RouteReport,
} from "@monana/grocery";
import { handle } from "../../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** GET — export report documents (CSV or printable HTML) */
export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "procurement";
    const format = url.searchParams.get("format") ?? "html";
    const orderId = url.searchParams.get("orderId");

    const run = await getMarketRunById(id);
    if (!run) throw new ApiError("Ripoti haipatikani", 404);

    if (type === "procurement") {
      const report = run.procurement as ProcurementReport;
      if (format === "csv") {
        return new Response(procurementToCsv(report), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="procurement-${run.deliveryDate}.csv"`,
          },
        });
      }
      return new Response(procurementToHtml(report), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (type === "routes") {
      const report = run.routes as RouteReport;
      if (format === "csv") {
        return new Response(routesToCsv(report), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="routes-${run.deliveryDate}.csv"`,
          },
        });
      }
      return new Response(routesToHtml(report), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (type === "packing") {
      const packing = run.packing as PackingReport;
      const sheet = orderId
        ? packing.sheets.find((s) => s.orderId === orderId)
        : packing.sheets[0];
      if (!sheet) throw new ApiError("Checklist ya oda haipatikani", 404);
      return new Response(packingSheetToHtml(sheet, run.deliveryDate), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    throw new ApiError("type lazima iwe procurement, routes, au packing", 400);
  });
}
