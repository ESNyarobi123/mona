import { getPlatformSettings } from "@monana/settings";
import { formatTZS } from "@monana/utils";
import { parseLocale } from "@monana/i18n";
import QRCode from "qrcode";
import { buildLipaNambaQrPayload } from "./lipa-qr";

export async function buildLipaPaymentInstructions(amount: number, paymentToken: string, localeParam?: string | null) {
  const { lipaNamba, lipaNambaName } = await getPlatformSettings();
  const lipa = lipaNamba || "XXXXXXX";
  const lipaName = lipaNambaName || "MONANA";
  const locale = parseLocale(localeParam);
  const amountLabel = formatTZS(amount);
  const steps =
    locale === "sw"
      ? `Lipa ${amountLabel} kwa Lipa Namba ${lipa} (${lipaName}), kisha weka reference ya M-Pesa hapa chini.`
      : `Pay ${amountLabel} to Lipa Namba ${lipa} (${lipaName}), then enter your M-Pesa reference below.`;

  const qrPayload = buildLipaNambaQrPayload(lipa);
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 280, margin: 2, errorCorrectionLevel: "M" });

  return {
    instructions: {
      lipaNamba: lipa,
      name: lipaName,
      amount: amountLabel,
      reference: paymentToken,
      steps,
      qrPayload,
    },
    qrDataUrl,
  };
}
