import { botMessage, type AppLocale, parseLocale } from "@monana/i18n";

export type BotMenuAction =
  | "RESTAURANT"
  | "GROCERY"
  | "GROCERY_ON_DEMAND"
  | "GROCERY_MEMBERSHIP"
  | "MY_ORDERS"
  | "HELP"
  | "LANGUAGE";

export type BotMenuItem = {
  key: string;
  action: BotMenuAction;
  label: string;
};

export type BotMenuGroup = {
  title: string;
  items: BotMenuItem[];
};

export function buildBotMenu(localeInput?: string) {
  const locale = parseLocale(localeInput);

  const groups: BotMenuGroup[] = [
    {
      title: botMessage(locale, "groupShop"),
      items: [
        { key: "1", action: "RESTAURANT", label: botMessage(locale, "menuRestaurant") },
        { key: "2", action: "GROCERY", label: botMessage(locale, "menuGrocery") },
      ],
    },
    {
      title: botMessage(locale, "groupAccount"),
      items: [
        { key: "3", action: "MY_ORDERS", label: botMessage(locale, "menuMyOrders") },
        { key: "4", action: "HELP", label: botMessage(locale, "menuHelp") },
        { key: "5", action: "LANGUAGE", label: botMessage(locale, "menuLanguage") },
      ],
    },
  ];

  const lines = [botMessage(locale, "welcomeTitle"), ""];
  for (const group of groups) {
    lines.push(group.title);
    for (const item of group.items) {
      lines.push(`${item.key}. ${item.label}`);
    }
    lines.push("");
  }
  lines.push(locale === "sw" ? "Andika namba ya chaguo." : "Reply with an option number.");

  const actionByKey = Object.fromEntries(
    groups.flatMap((g) => g.items.map((i) => [i.key, i.action]))
  ) as Record<string, BotMenuAction>;

  return {
    locale,
    groups,
    welcome: lines.join("\n").trim(),
    actionByKey,
  };
}

export function getBotContent(localeInput?: string) {
  const locale = parseLocale(localeInput);
  const menu = buildBotMenu(locale);

  return {
    ...menu,
    messages: {
      firstTimeWelcome: botMessage(locale, "firstTimeWelcome"),
      registerAskName: botMessage(locale, "registerAskName"),
      chooseAgain: botMessage(locale, "chooseAgain"),
      emptyCatalog: botMessage(locale, "emptyCatalog"),
      askMoreOrDone: botMessage(locale, "askMoreOrDone"),
      emptyCart: botMessage(locale, "emptyCart"),
      askAddress: botMessage(locale, "askAddress"),
      paid: botMessage(locale, "paid"),
      support: botMessage(locale, "support"),
      fallback: botMessage(locale, "fallback"),
      payHint: botMessage(locale, "payHint"),
      upfrontPaymentHint: botMessage(locale, "upfrontPaymentHint"),
      pauseHint: botMessage(locale, "pauseHint"),
      basketEditHint: botMessage(locale, "basketEditHint"),
      chooseMonthlyDay: botMessage(locale, "chooseMonthlyDay"),
      mySubscriptions: botMessage(locale, "mySubscriptions"),
      groceryOnDemandHeader: botMessage(locale, "groceryOnDemandHeader"),
      membershipChoosePlan: botMessage(locale, "membershipChoosePlan"),
      membershipChooseDayWeekly: botMessage(locale, "membershipChooseDayWeekly"),
      membershipChooseDayMonthly: botMessage(locale, "membershipChooseDayMonthly"),
      membershipBasketHint: botMessage(locale, "membershipBasketHint"),
      languagePrompt: botMessage(locale, "languagePrompt"),
      groceryHubTitle: botMessage(locale, "groceryHubTitle"),
      grocerySubscribeTitle: botMessage(locale, "grocerySubscribeTitle"),
      groceryManageTitle: botMessage(locale, "groceryManageTitle"),
      groceryChoosePackage: botMessage(locale, "groceryChoosePackage"),
    },
  };
}
