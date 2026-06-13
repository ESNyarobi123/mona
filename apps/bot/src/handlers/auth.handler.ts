import { botMessage } from "@monana/i18n";
import { api } from "../services/api.service";
import { getSession, patchSession, type AppLocale } from "../services/session.service";

type Reply = (text: string) => Promise<void>;

export function isAuthKeyword(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ["register", "jisajili", "sajili"].includes(t);
}

export async function loadBotMenu(locale: AppLocale) {
  const menu = await api.getBotMenu(locale);
  return {
    welcome: menu.welcome,
    actionByKey: menu.actionByKey,
    messages: menu.messages,
  };
}

export async function showWelcome(phone: string, reply: Reply, name?: string) {
  const session = getSession(phone);
  const locale = session.data.locale ?? "en";
  const menu = await loadBotMenu(locale);
  patchSession(phone, "MENU", { botMenu: menu, cart: [] });

  // Personalised greeting replaces the generic title so we don't show two
  // "Karibu / Welcome" lines back-to-back for returning users.
  const title = botMessage(locale, "welcomeTitle");
  let body = menu.welcome;
  if (body.startsWith(title)) {
    body = body.slice(title.length).replace(/^\n+/, "");
  }
  const header = name
    ? locale === "sw"
      ? `👋 Karibu tena, *${name}*!`
      : `👋 Welcome back, *${name}*!`
    : title;

  await reply(`${header}\n\n${body}`);
}

export async function handleAuthFlow(phone: string, text: string, reply: Reply): Promise<boolean> {
  const session = getSession(phone);
  const locale = session.data.locale ?? "en";
  const lower = text.toLowerCase().trim();

  if (isAuthKeyword(lower) && session.state !== "REGISTER_NAME") {
    patchSession(phone, "REGISTER_NAME", { cart: [] });
    const menu = await loadBotMenu(locale);
    await reply(menu.messages.registerAskName ?? botMessage(locale, "registerAskName"));
    return true;
  }

  if (session.state === "REGISTER_NAME") {
    const name = text.trim();
    if (name.length < 2) {
      await reply(botMessage(locale, "nameTooShort"));
      return true;
    }
    try {
      const res = await api.register(phone, name);
      const userLocale = (res.user.locale === "sw" ? "sw" : "en") as AppLocale;
      patchSession(phone, "MENU", {
        userId: res.user.id,
        token: res.token,
        userName: res.user.name ?? name,
        locale: userLocale,
        cart: [],
      });
      await showWelcome(phone, reply, res.user.name ?? name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("tayari") || msg.includes("already")) {
        return welcomeBack(phone, reply);
      }
      await reply(`❌ ${msg}`);
    }
    return true;
  }

  return false;
}

export async function welcomeBack(phone: string, reply: Reply): Promise<boolean> {
  try {
    const res = await api.whatsappLogin(phone);
    const userLocale = (res.user.locale === "sw" ? "sw" : "en") as AppLocale;
    patchSession(phone, "MENU", {
      userId: res.user.id,
      token: res.token,
      userName: res.user.name ?? undefined,
      locale: userLocale,
      cart: [],
    });
    await showWelcome(phone, reply, res.user.name ?? undefined);
    return true;
  } catch {
    return false;
  }
}

export async function handleWelcomeAuth(phone: string, reply: Reply): Promise<void> {
  const session = getSession(phone);

  if (session.data.userId) {
    await showWelcome(phone, reply, session.data.userName);
    return;
  }

  if (await welcomeBack(phone, reply)) return;

  const locale = session.data.locale ?? "en";
  const menu = await loadBotMenu(locale);
  patchSession(phone, "REGISTER_NAME", { cart: [], botMenu: menu });
  await reply(menu.messages.firstTimeWelcome ?? botMessage(locale, "firstTimeWelcome"));
}

export function msg(phone: string, key: string): string {
  const session = getSession(phone);
  return session.data.botMenu?.messages[key] ?? botMessage(session.data.locale ?? "en", key as never);
}
