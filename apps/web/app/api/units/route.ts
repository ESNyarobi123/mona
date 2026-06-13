import { listUnits } from "@monana/grocery";
import { handle, ok } from "../../../lib/api";

// GET /api/units?module=GROCERY — public read of active units for shop & labels
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const module = url.searchParams.get("module") as "GROCERY" | "RESTAURANT" | null;
    return ok(
      await listUnits({
        module: module ?? undefined,
        activeOnly: true,
      })
    );
  });
}
