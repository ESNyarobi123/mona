import { loginSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { loginUser, signToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, loginSchema);
    const user = await loginUser(input);
    const token = signToken({ sub: user.id, role: user.role, phone: user.phone });
    return ok({ user, token });
  });
}
