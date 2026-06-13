import { z } from "zod";
import { phoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { loginByWhatsApp, signToken } from "../../../../lib/auth";

const schema = z.object({ phone: phoneSchema });

// POST /api/auth/whatsapp { phone }
// Option A: WhatsApp number = identity. No password. Existing user only.
export async function POST(req: Request) {
  return handle(async () => {
    const { phone } = await parseBody(req, schema);
    const user = await loginByWhatsApp(phone);
    const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
    return ok({ user, token });
  });
}
