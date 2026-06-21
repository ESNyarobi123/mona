import { botMessage } from "@monana/i18n";
import { getSession, patchSession, sessionLocale } from "../services/session.service";
import { api } from "../services/api.service";
import { sendImageDataUrl } from "../connection/whatsapp";
import { formatTZS } from "../utils/formatter";

type Reply = (text: string) => Promise<void>;

/** Send Lipa Namba instructions + optional QR; set AWAIT_PAYMENT state. */
export async function sendPaymentRequest(
  phone: string,
  checkoutId: string,
  total: number,
  reply: Reply,
  heading?: string,
  options?: { isIntent?: boolean }
) {
  const locale = sessionLocale(phone);
  const isIntent = options?.isIntent ?? false;
  const pay = await api.createPayment(
    isIntent ? { intentId: checkoutId } : { orderId: checkoutId },
    locale
  );
  const session = getSession(phone);
  patchSession(phone, "AWAIT_PAYMENT", {
    ...session.data,
    orderId: isIntent ? undefined : checkoutId,
    intentId: isIntent ? checkoutId : undefined,
    paymentId: pay.payment.id,
    membershipMode: false,
  });

  const ref = `#${checkoutId.slice(-6).toUpperCase()}`;
  const amount = formatTZS(total);
  const instructions = botMessage(locale, "payInstructions", {
    ref,
    amount,
    lipa: pay.instructions.lipaNamba,
    name: pay.instructions.name,
  });

  await reply(heading ? `${heading}\n\n${instructions}` : instructions);

  if (pay.qrDataUrl) {
    try {
      await sendImageDataUrl(phone, pay.qrDataUrl, botMessage(locale, "payQrCaption", { amount }));
      return;
    } catch {
      // fall through
    }
  }
  await reply(botMessage(locale, "payNoQr"));
}

/** After payment proof: keep login session, return to menu. */
export async function finishPaymentProof(phone: string, reference: string, reply: Reply) {
  const session = getSession(phone);
  const locale = session.data.locale ?? "en";
  const keep = {
    locale: session.data.locale,
    userId: session.data.userId,
    userName: session.data.userName,
    token: session.data.token,
    botMenu: session.data.botMenu,
  };

  try {
    const ref = reference.trim();
    if (!ref || /^manual$/i.test(ref)) {
      throw new Error(botMessage(locale, "paymentReferenceInvalid"));
    }
    if (session.data.intentId) {
      await api.submitPayment({ intentId: session.data.intentId, reference: ref });
    } else if (session.data.paymentId) {
      await api.submitPayment({ paymentId: session.data.paymentId, reference: ref });
    } else {
      throw new Error(botMessage(locale, "paymentRefRejected"));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : botMessage(locale, "paymentRefRejected");
    return reply(`❌ ${message}`);
  }

  patchSession(phone, "MENU", {
    ...keep,
    cart: [],
    orderId: undefined,
    intentId: undefined,
    paymentId: undefined,
    membershipMode: false,
    activeSubscriptionId: undefined,
    groceryPackages: undefined,
    selectedPackageId: undefined,
  });
  return reply(botMessage(locale, "paid"));
}
