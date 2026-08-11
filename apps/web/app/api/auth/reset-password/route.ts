import { resetPasswordSchema } from "@monana/types";
import { resetPasswordWithCode, UserServiceError } from "@monana/users";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError } from "../../../../lib/auth";

// POST /api/auth/reset-password — verify WhatsApp OTP and set new password
export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, resetPasswordSchema);
    try {
      return ok(await resetPasswordWithCode(input.phone, input.code, input.newPassword));
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
