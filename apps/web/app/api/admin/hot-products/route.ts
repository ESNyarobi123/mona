import { businessModuleSchema, hotProductsConfigSchema } from "@monana/types";
import {
  getAllConfigs,
  getAdminHotProductsView,
  updateConfig,
} from "@monana/hot-products";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

/** GET /api/admin/hot-products?module=GROCERY — config, manual picks, auto preview */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    const moduleParam = url.searchParams.get("module");

    if (!moduleParam) {
      const configs = await getAllConfigs();
      const views = await Promise.all(
        configs.map((c) => getAdminHotProductsView(c.module))
      );
      return ok({ configs, modules: views });
    }

    const parsed = businessModuleSchema.safeParse(moduleParam);
    if (!parsed.success) throw new Error("module must be GROCERY or RESTAURANT");
    return ok(await getAdminHotProductsView(parsed.data));
  });
}

/** PATCH /api/admin/hot-products — update config (enable/disable, AUTO/MANUAL) */
export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, hotProductsConfigSchema);
    const { module, ...patch } = input;
    await updateConfig(module, patch);
    return ok(await getAdminHotProductsView(module));
  });
}
