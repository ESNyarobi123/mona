import { getBotContent } from "@monana/bot-content";
import { getPlatformSettings, syncBotWhatsappNumber } from "@monana/settings";
import { parseLocale, type AppLocale } from "@monana/i18n";
import { normalizeTanzaniaPhone, whatsAppUrlFromPhone } from "@monana/utils";
import { fetchBotHealth, fetchBotStatus } from "./bot-client";

export type BotShowcaseData = {
  locale: AppLocale;
  connected: boolean;
  phone: string | null;
  phoneDisplay: string | null;
  whatsappUrl: string | null;
  menu: {
    welcome: string;
    groups: { title: string; items: { key: string; label: string }[] }[];
  };
  payment: {
    lipaNamba: string;
    lipaNambaName: string;
    sampleOrderId: string;
    sampleTotal: string;
    steps: string;
  };
  features: { icon: string; title: string; text: string }[];
};

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length >= 9) {
    return `+255 ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
  }
  return `+${digits}`;
}

/** Public landing data: linked bot number + menu preview + payment info */
export async function getBotShowcase(localeInput?: string): Promise<BotShowcaseData> {
  const locale = parseLocale(localeInput);
  const [botOnline, botStatus, content, settings] = await Promise.all([
    fetchBotHealth(),
    fetchBotStatus(),
    Promise.resolve(getBotContent(locale)),
    getPlatformSettings(),
  ]);

  const livePhone =
    botStatus?.connected && botStatus.phone
      ? normalizeTanzaniaPhone(botStatus.phone)
      : null;
  if (livePhone) void syncBotWhatsappNumber(livePhone);

  const storedPhone = settings.botWhatsappNumber?.trim()
    ? normalizeTanzaniaPhone(settings.botWhatsappNumber)
    : null;
  const phone = livePhone ?? storedPhone;

  const lipa = settings.lipaNamba?.trim() || "XXXXXXX";
  const lipaName = settings.lipaNambaName?.trim() || "MONANA";
  const sampleTotal = "TZS 24,500";

  return {
    locale,
    connected: Boolean(botOnline && botStatus?.connected),
    phone,
    phoneDisplay: phone ? formatPhoneDisplay(phone) : null,
    whatsappUrl: whatsAppUrlFromPhone(phone),
    menu: {
      welcome: content.welcome,
      groups: content.groups.map((g) => ({
        title: g.title,
        items: g.items.map((i) => ({ key: i.key, label: i.label })),
      })),
    },
    payment: {
      lipaNamba: lipa,
      lipaNambaName: lipaName,
      sampleOrderId: "MNA-7K2P",
      sampleTotal,
      steps:
        locale === "sw"
          ? `Lipa ${sampleTotal} kwa Lipa Namba ${lipa} (${lipaName}), kisha tuma reference.`
          : `Pay ${sampleTotal} to Lipa Namba ${lipa} (${lipaName}), then send your reference.`,
    },
    features: [
      {
        icon: "💬",
        title: locale === "sw" ? "Menyu rahisi" : "Smart menu",
        text:
          locale === "sw"
            ? "Chagua Restaurant, Grocery, au Uanachama kwa namba tu."
            : "Pick Restaurant, Grocery, or Membership with a single reply.",
      },
      {
        icon: "🛒",
        title: locale === "sw" ? "Oda & malipo" : "Order & pay",
        text:
          locale === "sw"
            ? "Weka oda, lipa kwa Lipa Namba, thibitisha kwa chat."
            : "Place orders, pay via Lipa Namba, confirm — all in chat.",
      },
      {
        icon: "📦",
        title: locale === "sw" ? "Usajili & kikapu" : "Membership",
        text:
          locale === "sw"
            ? "Sitisha, hariri kikapu, au angalia oda zako popote."
            : "Pause, edit basket, or track orders anytime.",
      },
    ],
  };
}
