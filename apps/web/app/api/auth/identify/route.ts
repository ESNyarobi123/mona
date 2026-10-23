import { z } from "zod";
import { phoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { findOrCreateUser, signToken } from "../../../../lib/auth";
import { ApiError, isBotChannel } from "../../../../lib/auth";

const schema = z.object({ phone: phoneSchema, name: z.string().optional() });

// POST /api/auth/identify { phone, name? }
// Legacy bot helper — bot-bridge only (shared secret required).
export async function POST(req: Request) {
  return handle(async () => {
    if (!isBotChannel(req)) throw new ApiError("Huna ruhusa", 403);

    const { phone, name } = await parseBody(req, schema);
    const user = await findOrCreateUser(phone, name);
    if (user.role !== "CUSTOMER") {
      throw new ApiError("Akaunti hii inahitaji kuingia kwa password kwenye tovuti", 403);
    }
    const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
    return ok({ user, token });
  });
}
