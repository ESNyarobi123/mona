import { notificationTestSchema } from "@monana/types";
import { sendNotificationTest, NOTIFICATION_TEMPLATES } from "@monana/notifications";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

// GET — list templates
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return ok(NOTIFICATION_TEMPLATES);
  });
}

// POST { templateId } — send test message
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const { templateId } = await parseBody(req, notificationTestSchema);
    const sent = await sendNotificationTest(templateId);
    if (!sent) {
      throw new Error(
        "Ujumbe haujatumwa — hakikisha bot imeunganishwa na admin number imewekwa"
      );
    }
    return ok({ sent: true, templateId });
  });
}
