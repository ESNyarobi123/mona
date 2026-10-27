import { z } from "zod";
import { phoneSchema } from "@monana/types";
import { toPublicUser } from "@monana/db";
import { handle, ok, parseBody } from "../../../../lib/api";
import { loginByWhatsApp, signToken } from "../../../../lib/auth";
import { ApiError, isBotChannel } from "../../../../lib/auth";

const schema = z.object({ phone: phoneSchema });

// POST /api/auth/whatsapp { phone }
// Option A: WhatsApp number = identity. No password. Existing user only.
// Bot-bridge only: the shared secret proves the caller owns the WhatsApp socket,
// otherwise anyone could mint a JWT for an arbitrary phone number (incl. ADMIN).
export async function POST(req: Request) {
  return handle(async () => {
    if (!isBotChannel(req)) throw new ApiError("Huna ruhusa", 403);

    const { phone } = await parseBody(req, schema);
    const user = await loginByWhatsApp(phone);

    // Password-less login is for customers only. Admin/staff must use /api/auth/login.
    if (user.role !== "CUSTOMER") {
      throw new ApiError("Akaunti hii inahitaji kuingia kwa password kwenye tovuti", 403);
    }

    const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
    return ok({ user: toPublicUser(user), token });
  });
}
