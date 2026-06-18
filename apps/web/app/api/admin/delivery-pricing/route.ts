import { businessModuleSchema, updateDeliveryPricingConfigSchema } from "@monana/types";
import { getDeliveryPricingConfig, updateDeliveryPricingConfig } from "@monana/settings";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

function parseModule(url: URL) {
  const raw = url.searchParams.get("module") ?? "GROCERY";
  return businessModuleSchema.parse(raw);
}

/** GET — delivery pricing config for a module */
export async function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const module = parseModule(new URL(req.url));
    return ok(await getDeliveryPricingConfig(module));
  });
}

/** PATCH — update delivery pricing config */
export async function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const module = parseModule(new URL(req.url));
    const input = await parseBody(req, updateDeliveryPricingConfigSchema);
    return ok(await updateDeliveryPricingConfig(module, input));
  });
}
