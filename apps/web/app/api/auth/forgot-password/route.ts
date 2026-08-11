import { forgotPasswordSchema } from "@monana/types";
import { notifyPasswordResetCode } from "@monana/notifications";
import { requestPasswordReset, UserServiceError } from "@monana/users";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError } from "../../../../lib/auth";

// POST /api/auth/forgot-password — request WhatsApp OTP (no auth)
export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, forgotPasswordSchema);
    try {
      const result = await requestPasswordReset(input.phone);
      if (result.sent) {
        const delivered = await notifyPasswordResetCode({
          phone: result.phone,
          code: result.code,
          locale: result.locale,
          expiresMinutes: result.expiresMinutes,
          name: result.name,
        });
        if (!delivered) {
          console.error("[forgot-password] WhatsApp send failed for", result.phone);
        }
      }
      return ok({
        ok: true,
        messageSw: result.messageSw,
        messageEn: result.messageEn,
      });
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
