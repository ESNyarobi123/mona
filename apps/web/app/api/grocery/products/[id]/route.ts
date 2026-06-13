import { updateGroceryProductSchema } from "@monana/types";
import { updateProduct, getProductById, deleteProduct } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) throw new ApiError("Bidhaa haipatikani", 404);
    return ok(product);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateGroceryProductSchema);
    return ok(await updateProduct(id, input));
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    return ok(await deleteProduct(id));
  });
}
