import { groceryProductSchema } from "@monana/types";
import { listProducts, listAllProducts, createProduct } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET  /api/grocery/products
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    if (url.searchParams.get("all") === "1") {
      requireAdmin(req);
      return ok(await listAllProducts(categoryId));
    }
    return ok(await listProducts(categoryId));
  });
}

// POST /api/grocery/products (admin)
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, groceryProductSchema);
    return ok(await createProduct(input), 201);
  });
}
