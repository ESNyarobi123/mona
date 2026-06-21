import { botMessage } from "@monana/i18n";
import { dayOfWeekLabel, frequencyLabel, formatPricePerUnit, localeDateString } from "@monana/utils";
import { getSession, patchSession, sessionLocale, type AppLocale } from "../services/session.service";
import { api } from "../services/api.service";
import { msg } from "./auth.handler";
import { sendPaymentRequest } from "./payment.handler";
import { formatTZS, numberedList } from "../utils/formatter";

type Reply = (text: string) => Promise<void>;

/** @deprecated Use api.getOnDemandCatalog() */
export async function getGroceryProducts() {
  const catalog = await api.getOnDemandCatalog();
  return catalog.products;
}

function withBack(phone: string, body: string): string {
  return `${body}\n\n${msg(phone, "backHint")}`;
}

function scheduleLabel(sub: { frequency: string; nextRunAt: string | null }, locale: AppLocale) {
  if (sub.nextRunAt) {
    return `${frequencyLabel(sub.frequency, locale)} · ${locale === "sw" ? "Utoaji" : "Next"}: ${localeDateString(sub.nextRunAt, locale)}`;
  }
  return frequencyLabel(sub.frequency, locale);
}

/** Entry: menu option 2 — smart grocery hub. */
export async function showGroceryHub(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "fallback"));

  const home = await api.getGroceryHome(userId, locale);

  if (home.subscription?.status === "PENDING_PAYMENT" && home.pendingPayment) {
    patchSession(phone, "MANAGING_SUBSCRIPTION", {
      activeSubscriptionId: home.subscription.id,
      pendingSubOrderId: home.pendingPayment.orderId,
      intentId: home.pendingPayment.intentId,
    });
    return reply(buildManageMenu(phone, home, locale));
  }

  if (home.subscription && (home.subscription.status === "ACTIVE" || home.subscription.status === "PAUSED")) {
    patchSession(phone, "MANAGING_SUBSCRIPTION", { activeSubscriptionId: home.subscription.id });
    return reply(buildManageMenu(phone, home, locale));
  }

  patchSession(phone, "CHOOSING_GROCERY", { groceryPackages: home.packages });
  return reply(withBack(phone, botMessage(locale, "groceryHubTitle")));
}

function buildManageMenu(
  phone: string,
  home: Awaited<ReturnType<typeof api.getGroceryHome>>,
  locale: AppLocale
) {
  const sub = home.subscription!;
  const schedule = scheduleLabel(sub, locale);
  const lines = [
    botMessage(locale, "groceryManageTitle", {
      name: sub.packageName,
      status: sub.status,
      schedule,
    }),
    "",
  ];

  if (home.pendingPayment) {
    lines.push(`1. ${botMessage(locale, "groceryManagePay")}`);
    lines.push(`2. ${botMessage(locale, "groceryManageShop")}`);
  } else {
    lines.push(`1. ${botMessage(locale, "groceryManageEdit")}`);
    lines.push(`2. ${botMessage(locale, "groceryManagePause")}`);
    lines.push(`3. ${botMessage(locale, "groceryManageShop")}`);
  }
  lines.push("", botMessage(locale, "backHint"));
  return lines.join("\n");
}

export async function handleGroceryHub(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  if (choice === "1") return startOnDemand(phone, reply);
  if (choice === "2") return startSubscribeFlow(phone, reply);
  return reply(withBack(phone, botMessage(locale, "groceryHubTitle")));
}

export async function startOnDemand(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const catalog = await api.getOnDemandCatalog();
  if (!catalog.products.length) return reply(msg(phone, "emptyCatalog"));
  patchSession(phone, "CHOOSING", {
    module: "GROCERY",
    groceryProducts: catalog.products,
    cart: [],
    membershipMode: false,
  });
  return reply(renderProductList(phone, catalog.products, locale, msg(phone, "groceryOnDemandHeader")));
}

export async function startSubscribeFlow(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "fallback"));

  const home = await api.getGroceryHome(userId, locale);
  if (!home.canEnroll) {
    patchSession(phone, "MANAGING_SUBSCRIPTION", { activeSubscriptionId: home.subscription!.id });
    return reply(buildManageMenu(phone, home, locale));
  }

  patchSession(phone, "CHOOSING_SUBSCRIBE", { groceryPackages: home.packages });
  return reply(withBack(phone, botMessage(locale, "grocerySubscribeTitle")));
}

export async function handleSubscribeChoice(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const session = getSession(phone);

  if (choice === "1") {
    const packages = session.data.groceryPackages ?? [];
    if (!packages.length) return reply(botMessage(locale, "groceryNoPackages"));
    patchSession(phone, "CHOOSING_PACKAGE", { groceryPackages: packages });
    const lines = packages.map(
      (p, i) => `${i + 1}. ${p.name} — ${formatTZS(p.price)} (${p.kindLabel})`
    );
    return reply(withBack(phone, `${botMessage(locale, "groceryChoosePackage")}\n${lines.join("\n")}`));
  }

  if (choice === "2") return startCustomMembership(phone, reply);
  return reply(withBack(phone, botMessage(locale, "grocerySubscribeTitle")));
}

export async function startCustomMembership(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const setup = await api.getMembershipSetup(locale);
  if (!setup.plans.length) return reply(msg(phone, "membershipNoPlans"));
  patchSession(phone, "CHOOSING_MEMBERSHIP_PLAN", { cart: [] });
  return reply(withBack(phone, msg(phone, "membershipChoosePlan")));
}

export async function handlePackageChoice(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const packages = getSession(phone).data.groceryPackages ?? [];
  const index = Number(choice) - 1;
  const pkg = packages[index];
  if (!pkg) return reply(withBack(phone, botMessage(locale, "groceryChoosePackage")));

  const setup = await api.getMembershipSetup(locale);
  const isWeekly = pkg.kind === "WEEKLY_BASKET" || pkg.frequency === "WEEKLY";

  patchSession(phone, "CHOOSING_PACKAGE_DAY", {
    selectedPackageId: pkg.id,
    selectedPackageKind: pkg.kind,
    deliverySlots: isWeekly ? setup.deliveryDays?.weekly ?? [] : undefined,
  });

  if (isWeekly) {
    return reply(withBack(phone, renderWeeklyDeliverySlots(phone, setup.deliveryDays?.weekly ?? [], locale)));
  }
  return reply(withBack(phone, msg(phone, "membershipChooseDayRecurring")));
}

export async function handlePackageDay(phone: string, input: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const pkgId = session.data.selectedPackageId;
  const kind = session.data.selectedPackageKind;
  if (!pkgId) return reply(msg(phone, "fallback"));

  let preferredDayOfWeek: number | undefined;
  let scheduledDeliveryDate: string | undefined;

  if (kind === "WEEKLY_BASKET" || kind === "WEEKLY") {
    const slots = session.data.deliverySlots ?? [];
    const slot = slots[Number(input) - 1];
    if (!slot) return reply(withBack(phone, renderWeeklyDeliverySlots(phone, slots, locale)));
    preferredDayOfWeek = slot.dayOfWeek;
    scheduledDeliveryDate = slot.date;
  } else {
    const dayMap: Record<string, number> = { "1": 3, "2": 6 };
    const dow = dayMap[input];
    if (dow == null) return reply(withBack(phone, msg(phone, "membershipChooseDayRecurring")));
    preferredDayOfWeek = dow;
  }

  patchSession(phone, "ASK_PACKAGE_ADDRESS", {
    preferredDayOfWeek,
    scheduledDeliveryDate,
  });
  return reply(msg(phone, "addressHint"));
}

export async function handlePackageAddress(phone: string, address: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { userId, selectedPackageId, preferredDayOfWeek, scheduledDeliveryDate, groceryPackages } = session.data;
  if (!userId || !selectedPackageId) return reply(msg(phone, "fallback"));

  const pkgMeta = groceryPackages?.find((p) => p.id === selectedPackageId);

  try {
    const result = await api.enrollPackage({
      userId,
      packageId: selectedPackageId,
      address,
      preferredDayOfWeek,
      scheduledDeliveryDate,
      startNow: true,
    });

    const schedule =
      preferredDayOfWeek != null
        ? locale === "sw"
          ? `Kila ${dayOfWeekLabel(preferredDayOfWeek, "sw")}`
          : `Every ${dayOfWeekLabel(preferredDayOfWeek, "en")}`
        : "";

    if (result.checkoutIntentId) {
      const heading = botMessage(locale, "groceryPackageEnrolled", {
        name: pkgMeta?.name ?? "Package",
        schedule,
      });
      return sendPaymentRequest(
        phone,
        result.checkoutIntentId,
        Number(result.pricing?.total ?? pkgMeta?.price ?? 0),
        reply,
        heading,
        { isIntent: true }
      );
    }

    if (result.firstOrder && result.firstPayment) {
      const heading = botMessage(locale, "groceryPackageEnrolled", {
        name: pkgMeta?.name ?? "Package",
        schedule,
      });
      return sendPaymentRequest(phone, result.firstOrder.id, Number(result.firstOrder.total), reply, heading);
    }

    patchSession(phone, "MENU", { cart: [], membershipMode: false });
    return reply(botMessage(locale, "groceryPackageEnrolled", { name: pkgMeta?.name ?? "Package", schedule }));
  } catch (e) {
    return reply(`❌ ${e instanceof Error ? e.message : msg(phone, "fallback")}`);
  }
}

export async function handleManageSubscription(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const session = getSession(phone);
  const { userId } = session.data;
  if (!userId) return reply(msg(phone, "fallback"));

  const home = await api.getGroceryHome(userId, locale);

  if (home.pendingPayment && choice === "1") {
    const amount = Number(home.pendingPayment.amount);
    if (home.pendingPayment.intentId) {
      return sendPaymentRequest(
        phone,
        home.pendingPayment.intentId,
        amount,
        reply,
        botMessage(locale, "subscriptionPendingPay"),
        { isIntent: true }
      );
    }
    return sendPaymentRequest(
      phone,
      home.pendingPayment.orderId!,
      amount,
      reply,
      botMessage(locale, "subscriptionPendingPay")
    );
  }

  if (choice === "1" && !home.pendingPayment) {
    return handleManageEdit(phone, reply);
  }
  if (choice === "2" && !home.pendingPayment) {
    return handleManagePause(phone, reply);
  }
  if (choice === String(home.pendingPayment ? 2 : 3)) {
    return startOnDemand(phone, reply);
  }

  return reply(buildManageMenu(phone, home, locale));
}

async function handleManageEdit(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId, activeSubscriptionId } = getSession(phone).data;
  if (!userId || !activeSubscriptionId) return reply(msg(phone, "noActiveSubscription"));

  const upcoming = await api.getSubscriptionUpcoming(activeSubscriptionId);
  if (!upcoming.canEditBasket) {
    return reply(
      botMessage(locale, "cannotEditBasket", {
        cutoff: upcoming.cutoffAt ? localeDateString(upcoming.cutoffAt, locale) : "—",
      })
    );
  }

  const catalog = await api.getOnDemandCatalog();
  patchSession(phone, "CHOOSING", {
    module: "GROCERY",
    groceryProducts: catalog.products,
    cart: [],
    membershipMode: false,
    activeSubscriptionId,
  });
  return reply(
    `${botMessage(locale, "editBasketHeader", {
      date: upcoming.nextRunAt ? localeDateString(upcoming.nextRunAt, locale) : "—",
    })}\n${renderProductList(phone, catalog.products, locale, msg(phone, "groceryOnDemandHeader"))}\n\n${msg(phone, "askMoreOrDone")}`
  );
}

async function handleManagePause(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { activeSubscriptionId } = getSession(phone).data;
  if (!activeSubscriptionId) return reply(msg(phone, "noActiveSubscription"));
  await api.pauseSubscription(activeSubscriptionId, 1);
  patchSession(phone, "MENU", { activeSubscriptionId: undefined });
  return reply(botMessage(locale, "subscriptionPaused", { weeks: 1 }));
}

function renderWeeklyDeliverySlots(
  phone: string,
  slots: { label: string; weekLabel: string }[],
  locale: AppLocale
) {
  const title =
    locale === "sw"
      ? "📅 *Siku ya kupokea mzigo wiki hii?*\n(Jumatano au Jumamosi pekee)\n"
      : "📅 *Delivery day this week?*\n(Wednesday or Saturday only)\n";
  if (!slots.length) {
    return (
      title +
      (locale === "sw"
        ? "Hakuna siku zilizobaki kwa sasa. Jaribu tena baadaye."
        : "No slots available right now. Try again later.")
    );
  }
  const lines = slots.map((slot, i) => `${i + 1}. ${slot.weekLabel} — ${slot.label}`);
  const prompt = locale === "sw" ? "Andika namba." : "Reply with a number.";
  return `${title}${lines.join("\n")}\n\n${prompt}\n${botMessage(locale, "backHint")}`;
}

export function renderWeeklyDeliverySlotsForOnDemand(
  phone: string,
  slots: { label: string; weekLabel: string }[],
  locale: AppLocale
) {
  return renderWeeklyDeliverySlots(phone, slots, locale);
}

function renderProductList(
  phone: string,
  products: { name: string; price: string; unit?: string; inStock?: boolean }[],
  locale: AppLocale,
  header?: string
) {
  const head = header ?? msg(phone, "groceryOnDemandHeader");
  const prompt =
    locale === "sw"
      ? "👉 Andika *namba* kuongeza · *maliza* ukimaliza"
      : "👉 Reply with a *number* to add · *done* when finished";
  const oosLabel = locale === "sw" ? " (imeisha)" : " (out of stock)";
  return `${head}\n${numberedList(
    products.map((p) => {
      const line = `${p.name} — ${formatPricePerUnit(Number(p.price), p.unit ?? "PIECE", locale)}`;
      return p.inStock === false ? `${line}${oosLabel}` : line;
    })
  )}\n\n${prompt}\n${botMessage(locale, "backHint")}`;
}
