import { sendCateringQuote } from "@monana/catering";
import { sendCateringQuoteSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";
import { notifyCustomerCateringQuote } from "../../../../../../lib/whatsapp";

type Ctx = { params: Promise<{ id: string }> };

export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const input = await parseBody(req, sendCateringQuoteSchema);
    const result = await sendCateringQuote(id, input.quotedPrice, input.adminNote);

    const phone = result.request.user?.phone;
    if (phone) {
      void notifyCustomerCateringQuote({
        phone,
        label:
          result.request.package?.nameSw ??
          result.request.package?.nameEn ??
          result.request.eventType,
        quotedPrice: result.quotedPrice,
        payUrl: result.payUrl,
        locale: result.request.user?.locale,
      });
    }

    return ok({
      ...result.request,
      payUrl: result.payUrl,
      payPath: result.payPath,
      priceLabel: result.priceLabel,
      orderId: result.orderId,
    });
  });
}
