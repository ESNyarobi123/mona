import {
  generateMarketRun,
  getMarketRunByDate,
  listMarketRuns,
} from "@monana/grocery";
import { generateMarketRunSchema, deliveryDateSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

/** GET — list market runs · POST — generate/refresh run for a delivery date */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (date) {
      deliveryDateSchema.parse(date);
      const run = await getMarketRunByDate(date);
      return ok(run);
    }
    const limit = Math.min(60, Number(url.searchParams.get("limit") ?? 30));
    return ok(await listMarketRuns(limit));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, generateMarketRunSchema);
    const run = await generateMarketRun({
      deliveryDate: input.deliveryDate,
      trigger: "MANUAL",
      lock: input.lock,
    });
    return ok(run, 201);
  });
}
