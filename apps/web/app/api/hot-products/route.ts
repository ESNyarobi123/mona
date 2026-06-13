import { businessModuleSchema } from "@monana/types";
import { getHotProducts } from "@monana/hot-products";
import { handle, ok } from "../../../lib/api";

/** GET /api/hot-products?module=GROCERY|RESTAURANT — customer hot/trending items */
export function GET(req: Request) {
  return handle(async () => {
    const moduleParam = new URL(req.url).searchParams.get("module") ?? "GROCERY";
    const parsed = businessModuleSchema.safeParse(moduleParam);
    if (!parsed.success) throw new Error("module must be GROCERY or RESTAURANT");
    return ok(await getHotProducts(parsed.data));
  });
}
