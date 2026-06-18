import { quoteOrderDelivery } from "@monana/orders";
import { deliveryQuoteSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";

/** POST — preview subtotal + delivery fee for checkout */
export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, deliveryQuoteSchema);
    return ok(
      await quoteOrderDelivery({
        module: input.module,
        address: input.address,
        items: input.items,
        forceFreeDelivery: input.forceFreeDelivery,
      })
    );
  });
}
