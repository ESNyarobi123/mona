import { categorySchema } from "@monana/types";
import { listCategories, createCategory } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET  /api/grocery/categories?module=GROCERY|RESTAURANT
// POST /api/grocery/categories (admin)
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const module = new URL(req.url).searchParams.get("module") as "GROCERY" | "RESTAURANT" | null;
    return ok(await listCategories(module ?? "GROCERY"));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, categorySchema);
    return ok(await createCategory(input), 201);
  });
}
