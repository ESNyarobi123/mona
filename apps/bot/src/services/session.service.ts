import type { BusinessModule } from "./api.service";

export type AppLocale = "en" | "sw";

export type State =
  | "IDLE"
  | "REGISTER_NAME"
  | "MENU"
  | "CHOOSING_SLOT"
  | "CHOOSING"
  | "CHOOSING_MEMBERSHIP_PLAN"
  | "CHOOSING_MEMBERSHIP_DAY"
  | "ASK_GROCERY_DELIVERY"
  | "ASK_ADDRESS"
  | "ASK_EXTRA_DETAILS"
  | "ASK_PAYMENT_TIMING"
  | "ASK_SUB_ADDRESS"
  | "CHOOSING_PAY_ORDER"
  | "AWAIT_PAYMENT"
  | "ASK_PAYMENT_REFERENCE"
  | "CHOOSING_RESTAURANT_HUB"
  | "CHOOSING_RESTAURANT_MEMBERSHIP_SLOTS"
  | "ASK_RESTAURANT_MEMBERSHIP_ADDRESS"
  | "CHOOSING_LANGUAGE"
  | "CHOOSING_GROCERY"
  | "MANAGING_SUBSCRIPTION"
  | "CHOOSING_SUBSCRIBE"
  | "CHOOSING_PACKAGE"
  | "CHOOSING_PACKAGE_DAY"
  | "ASK_PACKAGE_ADDRESS";

export type CartLine = {
  productId?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
};

export type BotMenuCache = {
  welcome: string;
  actionByKey: Record<string, string>;
  messages: Record<string, string>;
};

export type SessionData = {
  locale: AppLocale;
  token?: string;
  userName?: string;
  userId?: string;
  module?: BusinessModule;
  mealSlot?: "BREAKFAST" | "LUNCH" | "DINNER";
  groceryProducts?: { id: string; name: string; price: string; unit?: string; inStock?: boolean }[];
  menuItems?: { id: string; name: string; price: string; unit?: string }[];
  cart: CartLine[];
  membershipPlan?: "WEEKLY" | "MONTHLY";
  membershipMode?: boolean;
  preferredDayOfWeek?: number;
  preferredDayOfMonth?: number;
  scheduledDeliveryDate?: string;
  scheduledFor?: string;
  address?: string;
  note?: string;
  deliverySlots?: { date: string; dayOfWeek: number; label: string; deliveryAt: string; weekLabel: string }[];
  activeSubscriptionId?: string;
  orderId?: string;
  intentId?: string;
  paymentId?: string;
  payOrders?: { id: string; total: string; status: string }[];
  botMenu?: BotMenuCache;
  groceryPackages?: {
    id: string;
    name: string;
    price: number;
    kind: string;
    frequency: string;
    kindLabel: string;
  }[];
  selectedPackageId?: string;
  selectedPackageKind?: string;
  pendingSubOrderId?: string;
  selectedMealSlots?: ("BREAKFAST" | "LUNCH" | "DINNER")[];
};

export type Session = { state: State; data: SessionData };

const sessions = new Map<string, Session>();

export function getSession(phone: string): Session {
  return sessions.get(phone) ?? { state: "IDLE", data: { cart: [], locale: "en" } };
}

export function patchSession(phone: string, state: State, data: Partial<SessionData> = {}): Session {
  const current = getSession(phone);
  const next: Session = { state, data: { ...current.data, ...data } };
  sessions.set(phone, next);
  return next;
}

export function clearSession(phone: string): void {
  sessions.delete(phone);
}

export function sessionLocale(phone: string): AppLocale {
  return getSession(phone).data.locale ?? "en";
}
