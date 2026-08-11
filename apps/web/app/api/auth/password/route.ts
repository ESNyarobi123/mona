import { changePasswordSchema } from "@monana/types";
import { changeUserPassword, UserServiceError } from "@monana/users";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, requireAuth } from "../../../../lib/auth";

// POST /api/auth/password — change own password (requires current password)
export async function POST(req: Request) {
  return handle(async () => {
    const auth = requireAuth(req);
    const input = await parseBody(req, changePasswordSchema);
    try {
      return ok(await changeUserPassword(auth.sub, input.currentPassword, input.newPassword));
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
