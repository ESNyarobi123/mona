import { registerSchema, registerWebSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { registerUser, signToken } from "../../../../lib/auth";
import { notifyAdminNewUser } from "../../../../lib/whatsapp";

/** POST /api/auth/register — web (password required) or WhatsApp bot (name only) */
export async function POST(req: Request) {
  return handle(async () => {
    const isBot = req.headers.get("x-monana-channel") === "WHATSAPP";
    const input = isBot
      ? await parseBody(req, registerSchema)
      : await parseBody(req, registerWebSchema);

    const user = await registerUser(input);
    const channel = isBot ? "WHATSAPP" : "WEB";
    await notifyAdminNewUser({ name: user.name, phone: user.phone, channel }).catch(() => {});

    if (isBot) {
      const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
      return ok({ user, token }, 201);
    }

    return ok(
      {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          locale: user.locale,
        },
        message: "Account created successfully",
      },
      201
    );
  });
}
