import { checkPhoneSchema } from "@monana/types";
import { handle, ok } from "../../../../lib/api";
import { isPhoneAvailable } from "../../../../lib/auth";
import { normalizeTanzaniaPhone } from "@monana/utils";

/** GET /api/auth/check-phone?phone=2557… — is this number free to register? */
export function GET(req: Request) {
  return handle(async () => {
    const phoneRaw = new URL(req.url).searchParams.get("phone");
    const { phone } = checkPhoneSchema.parse({ phone: phoneRaw ?? "" });
    const normalized = normalizeTanzaniaPhone(phone);
    const available = await isPhoneAvailable(normalized);
    return ok({ available, phone: normalized });
  });
}
