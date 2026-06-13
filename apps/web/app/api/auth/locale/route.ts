import { updateLocaleSchema } from "@monana/types";
import { updateUserLocale } from "@monana/users";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireSelfAdminOrBot } from "../../../../lib/auth";

/** PATCH /api/auth/locale — set user language preference */
export async function PATCH(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, updateLocaleSchema);
    requireSelfAdminOrBot(req, input.userId);
    const user = await updateUserLocale(input.userId, input.locale);
    return ok({ user: { id: user.id, locale: user.locale } });
  });
}
