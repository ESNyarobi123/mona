import type { AppLocale } from "./locale";

export type BotMessageKey =
  | "firstTimeWelcome"
  | "registerAskName"
  | "welcomeTitle"
  | "chooseAgain"
  | "emptyCatalog"
  | "askMoreOrDone"
  | "emptyCart"
  | "askAddress"
  | "paid"
  | "support"
  | "fallback"
  | "payHint"
  | "upfrontPaymentHint"
  | "pauseHint"
  | "basketEditHint"
  | "chooseMonthlyDay"
  | "mySubscriptions"
  | "noOrdersYet"
  | "noSubscriptions"
  | "nameTooShort"
  | "basketUpdated"
  | "subscriptionPaused"
  | "noActiveSubscription"
  | "cannotEditBasket"
  | "editBasketHeader"
  | "membershipEnrolled"
  | "languagePrompt"
  | "languageChanged"
  | "groupShop"
  | "groupMembership"
  | "groupAccount"
  | "menuRestaurant"
  | "menuGroceryNow"
  | "menuGroceryMembership"
  | "menuMyOrders"
  | "menuHelp"
  | "menuLanguage"
  | "groceryOnDemandHeader"
  | "membershipChoosePlan"
  | "membershipChooseDayWeekly"
  | "membershipChooseDayMonthly"
  | "membershipChooseDayRecurring"
  | "membershipBasketHint"
  | "membershipNoPlans"
  | "orderOnDemand"
  | "orderSubscription"
  | "orderReceived"
  | "payInstructions"
  | "payQrCaption"
  | "payNoQr"
  | "awaitingPayment"
  | "paymentReferencePrompt"
  | "paymentReferenceInvalid"
  | "paymentRefRejected"
  | "itemAdded"
  | "membershipReady"
  | "backHint"
  | "backHome"
  | "cartEmptyHint"
  | "addressHint"
  | "extraDetailsHint"
  | "paymentTimingPrompt"
  | "payLaterPlaced"
  | "payDeliveryChoose"
  | "noOrdersToPay"
  | "menuGrocery"
  | "groceryHubTitle"
  | "restaurantHubTitle"
  | "restaurantMembershipChooseSlots"
  | "restaurantMembershipAddressHint"
  | "restaurantMembershipEnrolled"
  | "restaurantMembershipActive"
  | "restaurantMembershipNone"
  | "restaurantMembershipStatus"
  | "restaurantMembershipFailed"
  | "groceryHubOnDemand"
  | "groceryHubSubscribe"
  | "groceryHubMySub"
  | "groceryHubPendingPay"
  | "groceryManageTitle"
  | "groceryManageEdit"
  | "groceryManagePause"
  | "groceryManageShop"
  | "groceryManagePay"
  | "grocerySubscribeTitle"
  | "grocerySubscribePackage"
  | "grocerySubscribeCustom"
  | "groceryChoosePackage"
  | "groceryNoPackages"
  | "groceryHasSubActive"
  | "groceryPackageEnrolled"
  | "subscriptionPendingPay";

const EN: Record<BotMessageKey, string> = {
  firstTimeWelcome:
    "👋 Welcome to *Monana*!\n\nFirst time here? Reply with your *full name* to register (e.g. Eric Kimaro).",
  registerAskName: "📝 Enter your *full name*:",
  welcomeTitle: "👋 Welcome to *Monana*!",
  chooseAgain: "Reply with a number, or type *menu* to see options.",
  emptyCatalog: "Sorry, nothing is available right now.",
  askMoreOrDone: "Reply with an item *number* to add it.\nType *done* when finished. ✅",
  emptyCart: "Your cart is empty. Add an item first.",
  askAddress: "📍 Where should we deliver?\nSend your address (area / street).",
  paid: "🎉 Thank you! We got your payment.\nWe'll confirm shortly and update you. ✅",
  support: "📞 *Help*\nType *menu* to go back, or contact our team on the Monana app.",
  fallback: "Type *Hi* to start. 👋",
  payHint: "After paying, send your M-Pesa reference: *paid CODE* ✅",
  upfrontPaymentHint: "💳 Pay now to activate your membership.",
  pauseHint: "Pause: type *pause 1* (1 week) or *pause 2*.",
  basketEditHint: "Edit basket: type *edit* before the cutoff.",
  chooseMonthlyDay: "Enter delivery day of the month (1–28, e.g. *1* or *15*):",
  mySubscriptions: "📦 *Your subscriptions:*",
  noOrdersYet: "No orders or subscriptions yet.",
  noSubscriptions: "No subscriptions to pause or edit.",
  nameTooShort: "Name is too short. Enter your full name:",
  basketUpdated: "✅ Your upcoming delivery basket was updated!",
  subscriptionPaused: "✅ Subscription paused for {weeks} week(s). It will resume automatically.",
  noActiveSubscription: "You have no active subscription to manage.",
  cannotEditBasket: "⏰ Basket edit window closed. Cutoff: {cutoff}",
  editBasketHeader: "✏️ *Edit basket* — next delivery: {date}",
  membershipEnrolled: "✅ *Membership active!*\nPlan: *{plan}*\nSchedule: {schedule}",
  languagePrompt: "🌐 *Language / Lugha*\n1 English\n2 Kiswahili",
  languageChanged: "✅ Language set to *{language}*.",
  groupShop: "🛍 SHOP",
  groupMembership: "📦 MEMBERSHIP",
  groupAccount: "👤 ACCOUNT",
  menuRestaurant: "Restaurant — Order meals",
  menuGroceryNow: "Grocery — Shop now",
  menuGroceryMembership: "Join — Save 5%",
  menuMyOrders: "My Orders",
  menuHelp: "Help",
  menuLanguage: "Language",
  groceryOnDemandHeader: "Shop now — pick items, then type *done*",
  membershipChoosePlan:
    "📦 *Choose your plan:*\n\n1️⃣ Weekly — save 3%\n2️⃣ Monthly — save 5% + free delivery\n\nReply *1* or *2*.",
  membershipChooseDayWeekly:
    "📅 *Delivery day this week?* (Wednesday or Saturday only)\nReply after you see the slot list.",
  membershipChooseDayMonthly:
    "📅 *Which day each month?*\nSend a number from *1* to *28* (e.g. 1 or 15).",
  membershipChooseDayRecurring:
    "📅 *Which day every week?*\n\n1 Wednesday (Jumatano)\n2 Saturday (Jumamosi)\n\nReply with a number.",
  membershipBasketHint:
    "🛒 Pick the items you want every time.\nReply with item *numbers*, then type *done*. ✅",
  membershipNoPlans: "Membership is not available right now.",
  orderOnDemand: "On-demand",
  orderSubscription: "Subscription",
  orderReceived: "✅ *Order received!*",
  payInstructions:
    "🧾 Order {ref}\n💰 To pay: *{amount}*\n\n📲 *How to pay (Lipa Namba):*\n1. Open M-Pesa / Tigo / Airtel / Halopesa\n2. Lipa Namba: *{lipa}*  ({name})\n3. Enter amount: *{amount}*\n\n✅ *After paying, send your M-Pesa reference:*\n👉 *paid ABC123XYZ*",
  payQrCaption:
    "📷 Or scan this QR to pay *{amount}*.\n\n✅ *After paying, send your M-Pesa reference:*\n👉 *paid ABC123XYZ*",
  payNoQr:
    "✅ *After paying, send your M-Pesa reference:*\n👉 *paid ABC123XYZ* (paste the code from your SMS)",
  awaitingPayment:
    "💳 Still waiting for your payment.\n\n" +
    "✅ Reply with your M-Pesa reference, e.g. *paid QFG7H2K9*\n" +
    "Or paste the code from your M-Pesa SMS.",
  paymentReferencePrompt:
    "📝 *Send your M-Pesa reference*\n\n" +
    "Paste the confirmation code from your M-Pesa SMS, or type:\n" +
    "👉 *paid YOUR_CODE_HERE*",
  paymentReferenceInvalid:
    "❌ I need your M-Pesa reference code.\n\n" +
    "Paste the code from your SMS (e.g. *QFG7H2K9*), or type *paid QFG7H2K9*",
  paymentRefRejected:
    "That payment reference could not be accepted. Check the code and try again.",
  itemAdded: "✅ Added: {item}",
  membershipReady: "✅ *Membership ready!*\nPlan: *{plan}*\n📅 {schedule}",
  backHint: "↩️ _Type *0* to go back_",
  backHome: "🏠 Back to the main menu.",
  cartEmptyHint: "🛒 Your cart is empty — pick an item number first.",
  addressHint: "📍 Send your delivery address (area / street).\n↩️ _Type *0* to cancel_",
  extraDetailsHint:
    "💬 *Extra details* (required)\nGate, house color, door name, floor…\n↩️ _Type *0* to change address_",
  paymentTimingPrompt:
    "💳 *How do you want to pay?*\n\n1️⃣ Pay now (recommended — Lipa Namba before delivery)\n2️⃣ Pay on delivery (send request to admin first)",
  payLaterPlaced:
    "📨 *Request sent!* {ref}\n\nAdmin will review your pay-on-delivery request. We will notify you when your order is approved.",
  payDeliveryChoose: "💳 *Pay for which order?*\nReply with the order *number*.",
  noOrdersToPay: "No delivered orders waiting for payment right now.",
  menuGrocery: "Grocery",
  groceryHubTitle:
    "🛒 *Grocery*\nWhat would you like?\n\n1️⃣ Shop now (one-time order)\n2️⃣ Subscribe (weekly / monthly delivery)",
  restaurantHubTitle:
    "🍲 *Restaurant*\n\n1️⃣ Order now\n2️⃣ Join membership (meal reminders on WhatsApp)\n3️⃣ My membership",
  restaurantMembershipChooseSlots:
    "🎫 *Restaurant membership*\nPick your meal times (one, two, or all three).\nReply with numbers, e.g. `1` or `1 3`:\n\n1. 🌅 Breakfast\n2. ☀️ Lunch\n3. 🌙 Dinner",
  restaurantMembershipAddressHint:
    "📍 Send your delivery address (optional).\n↩️ Type *-* to skip",
  restaurantMembershipEnrolled:
    "✅ *Membership active!*\nYou'll get WhatsApp reminders when these windows open:\n*{slots}*",
  restaurantMembershipActive: "You already have restaurant membership for: *{slots}*",
  restaurantMembershipNone: "You don't have restaurant membership yet. Choose *2* from the restaurant menu to join.",
  restaurantMembershipStatus: "🎫 *Your membership*\nStatus: *{status}*\nMeals: *{slots}*",
  restaurantMembershipFailed: "Could not complete membership. Try again or contact support.",
  groceryHubOnDemand: "Shop now",
  groceryHubSubscribe: "Subscribe",
  groceryHubMySub: "My subscription",
  groceryHubPendingPay: "⏳ You have a subscription waiting for payment.",
  groceryManageTitle: "📦 *Your subscription:*\n*{name}* — {status}\n{schedule}",
  groceryManageEdit: "Edit basket",
  groceryManagePause: "Pause 1 week",
  groceryManageShop: "Shop more (one-time)",
  groceryManagePay: "Pay now",
  grocerySubscribeTitle:
    "📦 *Subscribe*\n\n1️⃣ Pick a ready-made package\n2️⃣ Build your own basket (save up to 5%)",
  grocerySubscribePackage: "Ready package",
  grocerySubscribeCustom: "Build my basket",
  groceryChoosePackage: "📦 *Pick a package:*\nReply with the package *number*.",
  groceryNoPackages: "No packages available right now. Try *Build my basket* instead.",
  groceryHasSubActive: "You already have an active subscription. See options below.",
  groceryPackageEnrolled: "✅ *Subscribed!*\nPackage: *{name}*\n📅 {schedule}",
  subscriptionPendingPay:
    "💳 Complete payment to activate your subscription. Send *paid YOUR_M-PESA_CODE* after paying.",
};

const SW: Record<BotMessageKey, string> = {
  firstTimeWelcome:
    "👋 Karibu *Monana*!\n\nMara ya kwanza? Andika *jina lako* kamili kujisajili (mf. Eric Kimaro).",
  registerAskName: "📝 Andika *jina lako* kamili:",
  welcomeTitle: "👋 Karibu *Monana*!",
  chooseAgain: "Andika namba, au *menu* kuona chaguo.",
  emptyCatalog: "Samahani, hakuna bidhaa kwa sasa.",
  askMoreOrDone: "Andika *namba* ya bidhaa kuiweka kikapuni.\nUkimaliza, andika *maliza* ✅",
  emptyCart: "Kikapu ni tupu. Chagua bidhaa kwanza.",
  askAddress: "📍 Tunakuletea wapi?\nTuma anwani yako (eneo / mtaa).",
  paid: "🎉 Asante! Tumepokea malipo yako.\nTutathibitisha na kukujulisha hivi punde. ✅",
  support: "📞 *Msaada*\nAndika *menu* kurudi, au wasiliana nasi kupitia app ya Monana.",
  fallback: "Andika *Hi* kuanza. 👋",
  payHint: "Ukishalipa, tuma reference ya M-Pesa: *nimelipa NAMBA* ✅",
  upfrontPaymentHint: "💳 Lipa sasa ili uanachama uanze.",
  pauseHint: "Sitisha: andika *sitisha 1* (wiki 1) au *sitisha 2*.",
  basketEditHint: "Badilisha kikapu: andika *hariri* kabla ya muda kufika.",
  chooseMonthlyDay: "Andika siku ya mwezi ya utoaji (1–28, mf. *1* au *15*):",
  mySubscriptions: "📦 *Usajili wako:*",
  noOrdersYet: "Huna oda wala usajili bado.",
  noSubscriptions: "Huna usajili unaoweza kusimamia.",
  nameTooShort: "Jina ni fupi sana. Andika jina lako kamili:",
  basketUpdated: "✅ Kikapu cha utoaji ujao kimesasishwa!",
  subscriptionPaused: "✅ Usajili umesitishwa kwa wiki {weeks}. Utarejeshwa kiotomatiki.",
  noActiveSubscription: "Huna usajili unaoweza kusimamia.",
  cannotEditBasket: "⏰ Muda wa kubadilisha kikapu umepita. Cutoff: {cutoff}",
  editBasketHeader: "✏️ *Hariri kikapu* — utoaji: {date}",
  membershipEnrolled: "✅ *Uanachama umefanikiwa!*\nMpango: *{plan}*\nRatiba: {schedule}",
  languagePrompt: "🌐 *Language / Lugha*\n1 English\n2 Kiswahili",
  languageChanged: "✅ Lugha imewekwa *{language}*.",
  groupShop: "🛍 UNUNUA",
  groupMembership: "📦 UANACHAMA",
  groupAccount: "👤 AKAUNTI",
  menuRestaurant: "Restaurant — Agiza chakula",
  menuGroceryNow: "Grocery — Nunua sasa",
  menuGroceryMembership: "Jiunge — Okoa 5%",
  menuMyOrders: "Oda Zangu",
  menuHelp: "Msaada",
  menuLanguage: "Lugha",
  groceryOnDemandHeader: "Nunua sasa — chagua bidhaa, kisha andika *maliza*",
  membershipChoosePlan:
    "📦 *Chagua mpango:*\n\n1️⃣ Kila wiki — okoa 3%\n2️⃣ Kila mwezi — okoa 5% + uwasilishaji bure\n\nAndika *1* au *2*.",
  membershipChooseDayWeekly:
    "📅 *Siku ya kupokea mzigo wiki hii?* (Jumatano au Jumamosi pekee)\nSubiri orodha ya siku.",
  membershipChooseDayMonthly:
    "📅 *Tarehe gani kila mwezi?*\nAndika namba kuanzia *1* hadi *28* (mf. 1 au 15).",
  membershipChooseDayRecurring:
    "📅 *Siku gani kila wiki?*\n\n1 Jumatano\n2 Jumamosi\n\nAndika namba.",
  membershipBasketHint:
    "🛒 Chagua bidhaa unazotaka kila mara.\nAndika *namba* za bidhaa, kisha *maliza*. ✅",
  membershipNoPlans: "Uanachama haupatikani kwa sasa.",
  orderOnDemand: "Papo kwa papo",
  orderSubscription: "Usajili",
  orderReceived: "✅ *Oda imepokelewa!*",
  payInstructions:
    "🧾 Oda {ref}\n💰 Kulipa: *{amount}*\n\n📲 *Jinsi ya kulipa (Lipa Namba):*\n1. Fungua M-Pesa / Tigo / Airtel / Halopesa\n2. Lipa Namba: *{lipa}*  ({name})\n3. Weka kiasi: *{amount}*\n\n✅ *Ukimaliza kulipa, tuma reference ya M-Pesa:*\n👉 *nimelipa ABC123XYZ*",
  payQrCaption:
    "📷 Au skani QR hii kulipa *{amount}*.\n\n✅ *Ukimaliza kulipa, tuma reference ya M-Pesa:*\n👉 *nimelipa ABC123XYZ*",
  payNoQr:
    "✅ *Ukimaliza kulipa, tuma reference ya M-Pesa:*\n👉 *nimelipa ABC123XYZ* (bandika namba kutoka SMS)",
  awaitingPayment:
    "💳 Bado nasubiri malipo yako.\n\n" +
    "✅ Jibu na reference ya M-Pesa, mf. *nimelipa QFG7H2K9*\n" +
    "Au bandika namba iliyotoka kwenye SMS ya M-Pesa.",
  paymentReferencePrompt:
    "📝 *Tuma reference ya M-Pesa*\n\n" +
    "Bandika namba iliyotoka kwenye SMS ya M-Pesa, au andika:\n" +
    "👉 *nimelipa NAMBA_YAKO*",
  paymentReferenceInvalid:
    "❌ Nahitaji namba ya reference ya M-Pesa.\n\n" +
    "Bandika namba kutoka SMS (mf. *QFG7H2K9*), au andika *nimelipa QFG7H2K9*",
  paymentRefRejected:
    "Reference hiyo haikubaliki. Angalia namba ya muamala na jaribu tena.",
  itemAdded: "✅ Imeongezwa: {item}",
  membershipReady: "✅ *Uanachama uko tayari!*\nMpango: *{plan}*\n📅 {schedule}",
  backHint: "↩️ _Andika *0* kurudi nyuma_",
  backHome: "🏠 Umerudi kwenye menyu kuu.",
  cartEmptyHint: "🛒 Kikapu ni tupu — chagua namba ya bidhaa kwanza.",
  addressHint: "📍 Tuma anwani ya kufikishia (eneo / mtaa).\n↩️ _Andika *0* kughairi_",
  extraDetailsHint:
    "💬 *Maelezo ya ziada* (lazima)\nMlango, rangi ya nyumba, jina la mlango, ghorofa…\n↩️ _Andika *0* kubadilisha anwani_",
  paymentTimingPrompt:
    "💳 *Ungependa kulipiaje?*\n\n1️⃣ Lipa sasa (inapendekezwa — Lipa Namba kabla ya mzigo)\n2️⃣ Lipa ukifika (tuma ombi kwa admin kwanza)",
  payLaterPlaced:
    "📨 *Ombi limetumwa!* {ref}\n\nAdmin ataangalia ombi lako la kulipia ukifika. Tutakujulisha oda ikikubaliwa.",
  payDeliveryChoose: "💳 *Lipa oda ipi?*\nAndika *namba* ya oda.",
  noOrdersToPay: "Hakuna oda iliyowasilishwa inayosubiri malipo kwa sasa.",
  menuGrocery: "Grocery",
  groceryHubTitle:
    "🛒 *Grocery*\nUnataka nini?\n\n1️⃣ Nunua leo (mara moja)\n2️⃣ Jiunge (utoaji kila wiki/mwezi)",
  restaurantHubTitle:
    "🍲 *Restaurant*\n\n1️⃣ Agiza sasa\n2️⃣ Jiunge uanachama (ukumbusho wa WhatsApp)\n3️⃣ Uanachama wangu",
  restaurantMembershipChooseSlots:
    "🎫 *Uanachama wa Restaurant*\nChagua muda/muda (moja, mbili, au zote tatu).\nAndika namba, mf. `1` au `1 3`:\n\n1. 🌅 Asubuhi\n2. ☀️ Mchana\n3. 🌙 Usiku",
  restaurantMembershipAddressHint:
    "📍 Tuma anwani ya kufikishia (si lazima).\n↩️ Andika *-* kuruka",
  restaurantMembershipEnrolled:
    "✅ *Uanachama umewashwa!*\nUtapokea ukumbusho wa WhatsApp dirisha likifunguka:\n*{slots}*",
  restaurantMembershipActive: "Tayari una uanachama wa restaurant kwa: *{slots}*",
  restaurantMembershipNone: "Bado hujajiunga na uanachama. Chagua *2* kwenye menyu ya restaurant.",
  restaurantMembershipStatus: "🎫 *Uanachama wako*\nHali: *{status}*\nMuda: *{slots}*",
  restaurantMembershipFailed: "Imeshindikana kujiunga. Jaribu tena au wasiliana nasi.",
  groceryHubOnDemand: "Nunua leo",
  groceryHubSubscribe: "Jiunge",
  groceryHubMySub: "Usajili wangu",
  groceryHubPendingPay: "⏳ Una usajili unasubiri malipo.",
  groceryManageTitle: "📦 *Usajili wako:*\n*{name}* — {status}\n{schedule}",
  groceryManageEdit: "Hariri kikapu",
  groceryManagePause: "Sitisha wiki 1",
  groceryManageShop: "Nunua zaidi (mara moja)",
  groceryManagePay: "Lipa sasa",
  grocerySubscribeTitle:
    "📦 *Jiunge*\n\n1️⃣ Chagua kifurushi kilichotayarishwa\n2️⃣ Jenga kikapu chako (okoa hadi 5%)",
  grocerySubscribePackage: "Kifurushi tayari",
  grocerySubscribeCustom: "Jenga kikapu changu",
  groceryChoosePackage: "📦 *Chagua kifurushi:*\nAndika *namba* ya kifurushi.",
  groceryNoPackages: "Hakuna vifurushi kwa sasa. Jaribu *Jenga kikapu changu*.",
  groceryHasSubActive: "Tayari una usajili unaotumika. Chaguo hapa chini.",
  groceryPackageEnrolled: "✅ *Umejiunga!*\nKifurushi: *{name}*\n📅 {schedule}",
  subscriptionPendingPay:
    "💳 Maliza malipo ili uanze. Ukimaliza, tuma *nimelipa NAMBA_YA_MPESA*.",
};

const MESSAGES: Record<AppLocale, Record<BotMessageKey, string>> = { en: EN, sw: SW };

export function botMessage(locale: AppLocale, key: BotMessageKey, vars?: Record<string, string | number>) {
  let text = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function botMessages(locale: AppLocale) {
  return MESSAGES[locale];
}
