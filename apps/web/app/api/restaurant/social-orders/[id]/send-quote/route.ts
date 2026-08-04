import { sendSocialOrderQuote } from "@monana/restaurant";
import { sendSocialOrderQuoteSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";
import { notifyCustomerSocialOrderQuote } from "../../../../../../lib/whatsapp";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/restaurant/social-orders/:id/send-quote — admin Send Price (RFQ)
export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const input = await parseBody(req, sendSocialOrderQuoteSchema);

    const result = await sendSocialOrderQuote(id, input.quotedPrice, input.adminNote);

    const phone = result.socialOrder.user?.phone;
    if (phone) {
      void notifyCustomerSocialOrderQuote({
        phone,
        dishName: result.socialOrder.dishName,
        quotedPrice: result.quotedPrice,
        payUrl: result.payUrl,
        locale: result.socialOrder.user?.locale,
      });
    }

    return ok({
      ...result.socialOrder,
      payUrl: result.payUrl,
      payPath: result.payPath,
      priceLabel: result.priceLabel,
    });
  });
}
