import type { IncomingMessage } from "../connection/whatsapp";
import { botMessage } from "@monana/i18n";
import {
  BOT_KEYWORDS,
  extractPaymentReference,
  extractMpesaCode,
  matchPauseWeeks,
  matchesKeyword,
} from "@monana/i18n";
import {
  moduleLabel,
  formatPricePerUnit,
  formatQuantity,
  dayOfWeekLabel,
  frequencyLabel,
  localeDateString,
  localeDateTimeString,
} from "@monana/utils";
import { getSession, patchSession, clearSession, sessionLocale, type AppLocale } from "../services/session.service";
import { api } from "../services/api.service";
import { handleAuthFlow, handleWelcomeAuth, isAuthKeyword, msg, showWelcome } from "./auth.handler";
import {
  showGroceryHub,
  handleGroceryHub,
  handleSubscribeChoice,
  handlePackageChoice,
  handlePackageDay,
  handlePackageAddress,
  handleManageSubscription,
} from "./grocery.handler";
import { sendPaymentRequest, finishPaymentProof } from "./payment.handler";
import { formatTZS, numberedList } from "../utils/formatter";

type Reply = (text: string) => Promise<void>;

export async function handleMessage(incoming: IncomingMessage, reply: Reply): Promise<void> {
  const { phone, text } = incoming;
  const lower = text.toLowerCase().trim();
  const session = getSession(phone);
  const locale = sessionLocale(phone);

  const paymentRef = extractPaymentReference(text, locale);
  if (paymentRef && session.data.paymentId) {
    return handlePaymentProof(phone, paymentRef, reply);
  }

  if (isAuthKeyword(lower) || session.state === "REGISTER_NAME") {
    const handled = await handleAuthFlow(phone, text, reply);
    if (handled) return;
  }

  if (
    matchesKeyword(lower, BOT_KEYWORDS.greetings) ||
    matchesKeyword(lower, BOT_KEYWORDS.menu) ||
    matchesKeyword(lower, BOT_KEYWORDS.home)
  ) {
    return handleWelcomeAuth(phone, reply);
  }

  if (!session.data.userId) {
    return handleWelcomeAuth(phone, reply);
  }

  if (matchesKeyword(lower, BOT_KEYWORDS.language)) {
    patchSession(phone, "CHOOSING_LANGUAGE");
    return reply(msg(phone, "languagePrompt"));
  }

  const pauseWeeks = matchPauseWeeks(lower);
  if (pauseWeeks != null) {
    return handlePauseSubscription(phone, pauseWeeks, reply);
  }

  if (matchesKeyword(lower, BOT_KEYWORDS.edit)) {
    return handleEditBasketStart(phone, reply);
  }

  switch (session.state) {
    case "MENU":
      return handleMenu(phone, lower, reply);
    case "CHOOSING_LANGUAGE":
      return handleLanguageChoice(phone, lower, reply);
    case "CHOOSING_SLOT":
      return handleSlotChoice(phone, lower, reply);
    case "CHOOSING":
      return handleChoosing(phone, lower, reply);
    case "CHOOSING_MEMBERSHIP_PLAN":
      return handleMembershipPlan(phone, lower, reply);
    case "CHOOSING_MEMBERSHIP_DAY":
      return handleMembershipDay(phone, lower, reply);
    case "ASK_ADDRESS":
      return handleAddress(phone, text, reply);
    case "ASK_SUB_ADDRESS":
      return handleSubAddress(phone, text, reply);
    case "AWAIT_PAYMENT":
      return handleAwaitingPayment(phone, text, reply);
    case "CHOOSING_GROCERY":
      return handleGroceryHub(phone, lower, reply);
    case "MANAGING_SUBSCRIPTION":
      return handleManageSubscription(phone, lower, reply);
    case "CHOOSING_SUBSCRIBE":
      return handleSubscribeChoice(phone, lower, reply);
    case "CHOOSING_PACKAGE":
      return handlePackageChoice(phone, lower, reply);
    case "CHOOSING_PACKAGE_DAY":
      return handlePackageDay(phone, lower, reply);
    case "ASK_PACKAGE_ADDRESS":
      return handlePackageAddress(phone, text, reply);
    default:
      return reply(`${msg(phone, "fallback")}\n\n${msg(phone, "pauseHint")}`);
  }
}

/** Append a short, friendly "type 0 to go back" line to any choice prompt. */
function withBack(phone: string, body: string): string {
  return `${body}\n\n${msg(phone, "backHint")}`;
}

/**
 * While a customer is paying: accept a pasted mobile-money code as proof,
 * otherwise gently remind them they only need to reply "nimelipa".
 * (A bare "nimelipa"/"paid" is already caught earlier by the keyword check.)
 */
async function handleAwaitingPayment(phone: string, text: string, reply: Reply) {
  const code = extractMpesaCode(text);
  if (code && getSession(phone).data.paymentId) {
    return handlePaymentProof(phone, code, reply);
  }
  return reply(msg(phone, "awaitingPayment"));
}

async function handleLanguageChoice(phone: string, choice: string, reply: Reply) {
  const session = getSession(phone);
  const nextLocale: AppLocale | null =
    choice === "1" ? "en" : choice === "2" ? "sw" : null;
  if (!nextLocale) return reply(msg(phone, "languagePrompt"));

  if (session.data.userId) {
    await api.updateLocale(session.data.userId, nextLocale);
  }
  const menu = await api.getBotMenu(nextLocale);
  patchSession(phone, "MENU", {
    locale: nextLocale,
    botMenu: { welcome: menu.welcome, actionByKey: menu.actionByKey, messages: menu.messages },
  });
  const label = nextLocale === "sw" ? "Kiswahili" : "English";
  await reply(`${botMessage(nextLocale, "languageChanged", { language: label })}\n\n${menu.welcome}`);
}

async function handlePauseSubscription(phone: string, weeks: number, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "fallback"));
  const subs = await api.listUserSubscriptions(userId);
  const active = subs.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT");
  if (!active) return reply(botMessage(locale, "noActiveSubscription"));
  await api.pauseSubscription(active.id, weeks);
  return reply(botMessage(locale, "subscriptionPaused", { weeks }));
}

async function handleEditBasketStart(phone: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { userId } = session.data;
  if (!userId) return reply(msg(phone, "fallback"));
  const subs = await api.listUserSubscriptions(userId);
  const active = subs.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT");
  if (!active) return reply(botMessage(locale, "noSubscriptions"));
  const upcoming = await api.getSubscriptionUpcoming(active.id);
  if (!upcoming.canEditBasket) {
    return reply(
      botMessage(locale, "cannotEditBasket", {
        cutoff: upcoming.cutoffAt ? localeDateTimeString(upcoming.cutoffAt, locale) : "—",
      })
    );
  }
  const catalog = await api.getOnDemandCatalog();
  patchSession(phone, "CHOOSING", {
    module: "GROCERY",
    groceryProducts: catalog.products,
    cart: [],
    activeSubscriptionId: active.id,
    membershipMode: false,
  });
  return reply(
    `${botMessage(locale, "editBasketHeader", {
      date: upcoming.nextRunAt ? localeDateString(upcoming.nextRunAt, locale) : "—",
    })}\n${renderProductList(catalog.products, locale, msg(phone, "groceryOnDemandHeader"))}\n\n${msg(phone, "askMoreOrDone")}`
  );
}

async function handleMenu(phone: string, choice: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const action = session.data.botMenu?.actionByKey[choice];

  if (!action) {
    if (!session.data.botMenu) {
      await showWelcome(phone, reply, session.data.userName);
      return;
    }
    return reply(msg(phone, "chooseAgain"));
  }

  switch (action) {
    case "RESTAURANT": {
      const slots = await api.listSlots(locale);
      patchSession(phone, "CHOOSING_SLOT", { module: "RESTAURANT", cart: [] });
      const lines = slots.map((s, i) => {
        const status =
          s.status === "OPEN"
            ? locale === "sw"
              ? "🟢 Wazi"
              : "🟢 Open"
            : locale === "sw"
              ? "🔴 Imefungwa"
              : "🔴 Closed";
        return `${i + 1}. ${s.label} — ${s.deliversFor}\n   ${locale === "sw" ? "Oda" : "Order"}: ${s.orderWindow} · ${status}`;
      });
      return reply(
        withBack(
          phone,
          `${moduleLabel("RESTAURANT", locale).emoji} *${moduleLabel("RESTAURANT", locale).title}*\n${lines.join("\n")}\n\n${locale === "sw" ? "👉 Andika namba ya dirisha." : "👉 Reply with a slot number."}`
        )
      );
    }
    case "GROCERY":
      return showGroceryHub(phone, reply);
    case "GROCERY_ON_DEMAND":
    case "GROCERY_MEMBERSHIP":
      return showGroceryHub(phone, reply);
    case "MY_ORDERS":
      return handleMyOrders(phone, reply);
    case "HELP":
      return reply(msg(phone, "support"));
    case "LANGUAGE":
      patchSession(phone, "CHOOSING_LANGUAGE");
      return reply(msg(phone, "languagePrompt"));
    default:
      return reply(msg(phone, "chooseAgain"));
  }
}

async function handleMyOrders(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "chooseAgain"));
  const [orders, subs] = await Promise.all([
    api.getUserOrders(userId),
    api.listUserSubscriptions(userId).catch(() => [] as Awaited<ReturnType<typeof api.listUserSubscriptions>>),
  ]);
  const lines: string[] = [];
  if (orders.length) {
    lines.push(locale === "sw" ? "🧾 *Oda:*" : "🧾 *Orders:*");
    lines.push(
      ...orders.slice(0, 4).map(
        (o) => `#${o.id.slice(-6)} • ${orderTypeLabel(o, locale)} • ${o.status} • ${formatTZS(Number(o.total))}`
      )
    );
  }
  if (subs.length) {
    lines.push("", msg(phone, "mySubscriptions").trim());
    lines.push(
      ...subs.slice(0, 3).map(
        (s) =>
          `• ${s.package.name} (${frequencyLabel(s.frequency, locale)}) — ${s.status}` +
          (s.nextRunAt ? `\n  ${locale === "sw" ? "Utoaji" : "Delivery"}: ${localeDateString(s.nextRunAt, locale)}` : "")
      )
    );
  }
  if (!lines.length) return reply(botMessage(locale, "noOrdersYet"));
  return reply(lines.join("\n"));
}

function orderTypeLabel(o: { module: string; orderType?: string | null }, locale: AppLocale) {
  if (o.module === "GROCERY" && o.orderType === "SUBSCRIPTION") {
    return botMessage(locale, "orderSubscription");
  }
  if (o.module === "GROCERY") return botMessage(locale, "orderOnDemand");
  return moduleLabel(o.module as "RESTAURANT" | "GROCERY", locale).title;
}

async function handleSlotChoice(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const slots = await api.listSlots(locale);
  const index = Number(choice) - 1;
  const slotEntry = slots[index];
  if (!slotEntry) {
    const lines = slots.map((s, i) => `${i + 1}. ${s.label}`);
    return reply(
      withBack(
        phone,
        `${locale === "sw" ? "👉 Chagua namba sahihi:" : "👉 Pick a valid number:"}\n${lines.join("\n")}`
      )
    );
  }
  if (slotEntry.status === "CLOSED") {
    return reply(
      withBack(
        phone,
        locale === "sw"
          ? `⛔ ${slotEntry.label} — dirisha limefungwa.\n🕒 Oda: ${slotEntry.orderWindow} (${slotEntry.deliversFor})`
          : `⛔ ${slotEntry.label} — ordering is closed.\n🕒 Window: ${slotEntry.orderWindow} (${slotEntry.deliversFor})`
      )
    );
  }
  const slot = slotEntry.slot as "BREAKFAST" | "LUNCH" | "DINNER";
  const items = await api.listRestaurantMenu(slot);
  if (!items.length) return reply(msg(phone, "emptyCatalog"));
  patchSession(phone, "CHOOSING", { mealSlot: slot, menuItems: items, cart: [], membershipMode: false });
  return reply(renderProductList(items, locale, `${moduleLabel("RESTAURANT", locale).emoji} ${moduleLabel("RESTAURANT", locale).title} — ${slotEntry.label}`));
}

async function handleMembershipPlan(phone: string, choice: string, reply: Reply) {
  const plan = choice === "1" ? "WEEKLY" : choice === "2" ? "MONTHLY" : null;
  if (!plan) return reply(msg(phone, "membershipChoosePlan"));
  patchSession(phone, "CHOOSING_MEMBERSHIP_DAY", { membershipPlan: plan });
  return reply(
    withBack(
      phone,
      plan === "WEEKLY" ? msg(phone, "membershipChooseDayWeekly") : msg(phone, "membershipChooseDayMonthly")
    )
  );
}

async function handleMembershipDay(phone: string, input: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const plan = session.data.membershipPlan;
  if (!plan) return reply(msg(phone, "fallback"));

  if (plan === "WEEKLY") {
    const dayMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6 };
    const dow = dayMap[input];
    if (dow == null) return reply(msg(phone, "membershipChooseDayWeekly"));
    const setup = await api.getMembershipSetup(locale);
    patchSession(phone, "CHOOSING", {
      module: "GROCERY",
      groceryProducts: setup.products,
      cart: [],
      membershipMode: true,
      preferredDayOfWeek: dow,
    });
    const schedule =
      locale === "sw" ? `Kila ${dayOfWeekLabel(dow, "sw")}` : `Every ${dayOfWeekLabel(dow, "en")}`;
    return reply(
      `✅ ${locale === "sw" ? "Utoaji" : "Delivery"}: *${schedule}*\n\n${msg(phone, "membershipBasketHint")}\n${renderProductList(setup.products, locale)}`
    );
  }

  const dom = Number(input);
  if (!Number.isInteger(dom) || dom < 1 || dom > 28) {
    return reply(msg(phone, "membershipChooseDayMonthly"));
  }
  const setup = await api.getMembershipSetup();
  patchSession(phone, "CHOOSING", {
    module: "GROCERY",
    groceryProducts: setup.products,
    cart: [],
    membershipMode: true,
    preferredDayOfMonth: dom,
  });
  const schedule = locale === "sw" ? `Tarehe ${dom} kwa mwezi` : `Day ${dom} of each month`;
  return reply(
    `✅ ${locale === "sw" ? "Utoaji" : "Delivery"}: *${schedule}*\n\n${msg(phone, "membershipBasketHint")}\n${renderProductList(setup.products, locale)}`
  );
}

async function handleChoosing(phone: string, input: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const list = session.data.module === "GROCERY" ? session.data.groceryProducts : session.data.menuItems;
  if (!list?.length) return reply(msg(phone, "fallback"));

  if (matchesKeyword(input, BOT_KEYWORDS.done)) {
    if (!session.data.cart.length) return reply(msg(phone, "cartEmptyHint"));
    if (session.data.activeSubscriptionId) {
      return handleEditBasketFinish(phone, reply);
    }
    patchSession(phone, session.data.membershipMode ? "ASK_SUB_ADDRESS" : "ASK_ADDRESS");
    return reply(`${cartSummary(session.data.cart, locale)}\n\n${msg(phone, "addressHint")}`);
  }

  const match = input.match(/^(\d+)(?:\s*x?\s*(\d+(?:\.\d+)?))?$/);
  if (!match) return reply(withBack(phone, msg(phone, "askMoreOrDone")));

  const index = Number(match[1]) - 1;
  const qty = match[2] ? Number(match[2]) : 1;
  const item = list[index];
  if (!item) return reply(withBack(phone, msg(phone, "askMoreOrDone")));

  const cart = [...session.data.cart];
  const key = session.data.module === "GROCERY" ? "productId" : "menuItemId";
  const existing = cart.find((c) => (key === "productId" ? c.productId : c.menuItemId) === item.id);
  const unit = item.unit ?? "PIECE";
  const line = {
    [key]: item.id,
    name: item.name,
    price: Number(item.price),
    quantity: qty,
    unit,
  } as (typeof cart)[0];
  if (existing) existing.quantity += qty;
  else cart.push(line);

  patchSession(phone, "CHOOSING", {
    cart,
    activeSubscriptionId: session.data.activeSubscriptionId,
    membershipMode: session.data.membershipMode,
  });
  return reply(
    `${botMessage(locale, "itemAdded", {
      item: `${formatQuantity(qty, unit, locale)} ${item.name}`,
    })}\n\n${cartSummary(cart, locale)}\n\n${msg(phone, "askMoreOrDone")}`
  );
}

async function handleAddress(phone: string, address: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { userId, module, cart, mealSlot, activeSubscriptionId } = session.data;

  if (activeSubscriptionId && cart.length) {
    await api.updateSubscriptionBasket(
      activeSubscriptionId,
      cart.map((c) => ({ productId: c.productId!, quantity: c.quantity }))
    );
    patchSession(phone, "MENU", { cart: [], activeSubscriptionId: undefined, membershipMode: false });
    return reply(botMessage(locale, "basketUpdated"));
  }

  if (!userId || !module || !cart.length) {
    clearSession(phone);
    return reply(msg(phone, "fallback"));
  }

  const order = await api.createOrder({
    userId,
    module,
    address,
    mealSlot,
    items: cart.map((c) => ({
      productId: c.productId,
      menuItemId: c.menuItemId,
      quantity: c.quantity,
    })),
  });

  const { title, emoji } = moduleLabel(module, locale);
  const heading = `${botMessage(locale, "orderReceived")}\n${emoji} *${title}*`;
  return sendPaymentRequest(phone, order.id, Number(order.total), reply, heading);
}

async function handleEditBasketFinish(phone: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { activeSubscriptionId, cart } = session.data;
  if (!activeSubscriptionId || !cart.length) return reply(msg(phone, "fallback"));
  await api.updateSubscriptionBasket(
    activeSubscriptionId,
    cart.map((c) => ({ productId: c.productId!, quantity: c.quantity }))
  );
  patchSession(phone, "MENU", { cart: [], activeSubscriptionId: undefined, membershipMode: false });
  return reply(botMessage(locale, "basketUpdated"));
}

async function handleSubAddress(phone: string, address: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { userId, membershipPlan, preferredDayOfWeek, preferredDayOfMonth, cart } = session.data;
  if (!userId || !membershipPlan || !cart.length) {
    clearSession(phone);
    return reply(msg(phone, "fallback"));
  }

  const result = await api.enrollMembership({
    userId,
    plan: membershipPlan,
    address,
    preferredDayOfWeek,
    preferredDayOfMonth,
    defaultBasket: cart.map((c) => ({ productId: c.productId!, quantity: c.quantity })),
    startNow: true,
  });

  const planLabel =
    membershipPlan === "WEEKLY"
      ? locale === "sw"
        ? "Kila Wiki"
        : "Weekly"
      : locale === "sw"
        ? "Kila Mwezi"
        : "Monthly";

  if (result.firstOrder && result.firstPayment) {
    const perks: string[] = [];
    if (result.pricing?.discountAmount) {
      perks.push(`💸 ${result.pricing.discountPercent}% ${locale === "sw" ? "punguzo" : "off"}`);
    }
    if (result.pricing?.freeDelivery) {
      perks.push(`🚚 ${locale === "sw" ? "Uwasilishaji BURE" : "FREE delivery"}`);
    }
    const heading =
      botMessage(locale, "membershipReady", {
        plan: planLabel,
        schedule: result.deliverySchedule ?? "",
      }) + (perks.length ? `\n${perks.join("  ·  ")}` : "");

    return sendPaymentRequest(phone, result.firstOrder.id, Number(result.firstOrder.total), reply, heading);
  }

  patchSession(phone, "MENU", { cart: [], membershipMode: false });
  return reply(
    botMessage(locale, "membershipReady", {
      plan: planLabel,
      schedule: result.deliverySchedule ?? "",
    })
  );
}

async function handlePaymentProof(phone: string, reference: string, reply: Reply) {
  return finishPaymentProof(phone, reference, reply);
}

function renderProductList(
  products: { name: string; price: string; unit?: string }[],
  locale: AppLocale,
  header?: string
) {
  const { title, emoji } = moduleLabel("GROCERY", locale);
  const head = header ?? `${emoji} *${title}*`;
  const prompt =
    locale === "sw"
      ? "👉 Andika *namba* kuongeza · *maliza* ukimaliza"
      : "👉 Reply with a *number* to add · *done* when finished";
  return `${head}\n${numberedList(
    products.map((p) => `${p.name} — ${formatPricePerUnit(Number(p.price), p.unit ?? "PIECE", locale)}`)
  )}\n\n${prompt}\n${botMessage(locale, "backHint")}`;
}

function cartSummary(cart: { name: string; price: number; quantity: number; unit?: string }[], locale: AppLocale) {
  const lines = cart.map(
    (c) => `• ${formatQuantity(c.quantity, c.unit ?? "PIECE", locale)} ${c.name} = ${formatTZS(c.price * c.quantity)}`
  );
  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const label = locale === "sw" ? "Kikapu" : "Cart";
  const totalLabel = locale === "sw" ? "Jumla" : "Total";
  return `🛒 *${label}:*\n${lines.join("\n")}\n${totalLabel}: *${formatTZS(total)}*`;
}
