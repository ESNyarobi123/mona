import { createUnitSchema, updateUnitSchema } from "@monana/types";
import { createUnit, listUnits } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET  /api/admin/units?module=GROCERY&active=1&usage=1
// POST /api/admin/units (admin)
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    const module = url.searchParams.get("module") as "GROCERY" | "RESTAURANT" | null;
    const activeOnly = url.searchParams.get("active") === "1";
    const includeUsage = url.searchParams.get("usage") === "1";

    return ok(
      await listUnits({
        module: module ?? undefined,
        activeOnly,
        includeUsage,
      })
    );
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, createUnitSchema);
    return ok(await createUnit(input), 201);
  });
}
