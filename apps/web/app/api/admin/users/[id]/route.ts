import { adminUpdateUserSchema, updateUserRoleSchema } from "@monana/types";
import { deleteUser, getUserById, updateUserAdmin, updateUserRole, UserServiceError } from "@monana/users";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/users/:id
// PATCH /api/admin/users/:id — full profile update or legacy { role }
// DELETE /api/admin/users/:id
export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) throw new ApiError("Mtumiaji hajapatikani", 404);
    return ok(user);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Legacy: only role field
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "role" in body) {
      const { role } = updateUserRoleSchema.parse(body);
      return ok(await updateUserRole(id, role));
    }

    const input = adminUpdateUserSchema.parse(body);
    try {
      return ok(await updateUserAdmin(id, input));
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    const auth = requireAdmin(req);
    const { id } = await params;

    if (auth.sub === id) {
      throw new ApiError("Huwezi kufuta akaunti yako mwenyewe.", 403);
    }

    try {
      return ok(await deleteUser(id));
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
