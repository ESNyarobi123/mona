import { z } from "zod";
import { phoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { findOrCreateUser, signToken } from "../../../../lib/auth";

const schema = z.object({ phone: phoneSchema, name: z.string().optional() });

// POST /api/auth/identify { phone, name? }
// Used by the WhatsApp bot to find-or-create a user by their number.
export async function POST(req: Request) {
  return handle(async () => {
    const { phone, name } = await parseBody(req, schema);
    const user = await findOrCreateUser(phone, name);
    const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
    return ok({ user, token });
  });
}
