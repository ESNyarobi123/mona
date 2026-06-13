import { adminCreateUserSchema } from "@monana/types";
import { createUserAdmin, listUsers, UserServiceError } from "@monana/users";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../lib/auth";
import { parsePagination } from "@monana/utils";

// GET /api/admin/users?role=&search=&page=&limit=
// POST /api/admin/users — create account
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    const pagination = parsePagination(url.searchParams);
    const role = url.searchParams.get("role") as "CUSTOMER" | "ADMIN" | "RIDER" | null;
    const search = url.searchParams.get("search") ?? undefined;
    return ok(
      await listUsers({
        page: pagination.page,
        limit: pagination.limit,
        role: role ?? undefined,
        search,
      })
    );
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, adminCreateUserSchema);
    try {
      return ok(await createUserAdmin(input), 201);
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
