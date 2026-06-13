const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000/api";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-monana-channel": "WHATSAPP",
    },
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `API ${path} failed (${res.status})`);
  }
  return json.data as T;
}

export type GroceryProduct = { id: string; name: string; price: string; unit?: string };
export type MenuItem = { id: string; name: string; price: string; mealSlots: string[]; unit?: string };
export type User = { id: string; name: string | null; phone: string; locale?: string };
export type BusinessModule = "RESTAURANT" | "GROCERY";
export type Subscription = {
  id: string;
  status: string;
  frequency: string;
  nextRunAt: string | null;
  package: { name: string; price: string };
};

export type BotMenuResponse = {
  locale: "en" | "sw";
  welcome: string;
  actionByKey: Record<string, string>;
  messages: Record<string, string>;
};

export type MembershipSetup = {
  plans: { id: "WEEKLY" | "MONTHLY"; title: string; label: string; discountPercent: number; freeDelivery: boolean }[];
  products: GroceryProduct[];
};

export type GroceryHome = {
  packages: {
    id: string;
    name: string;
    price: number;
    kind: string;
    frequency: string;
    kindLabel: string;
  }[];
  subscription: {
    id: string;
    status: string;
    frequency: string;
    packageName: string;
    nextRunAt: string | null;
    address: string;
  } | null;
  pendingPayment: { orderId: string; paymentId: string; amount: string } | null;
  canEnroll: boolean;
};

export const api = {
  register: (phone: string, name: string, password?: string) =>
    request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, name, password }),
    }),

  whatsappLogin: (phone: string) =>
    request<{ user: User; token: string }>("/auth/whatsapp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  updateLocale: (userId: string, locale: "en" | "sw") =>
    request<{ user: { id: string; locale: string } }>("/auth/locale", {
      method: "PATCH",
      body: JSON.stringify({ userId, locale }),
    }),

  getBotMenu: (locale: "en" | "sw" = "en") =>
    request<BotMenuResponse>(`/bot/menu?locale=${locale}`),

  getOnDemandCatalog: () =>
    request<{ products: GroceryProduct[] }>("/grocery/store/on-demand"),

  getGroceryHome: (userId: string, locale: "en" | "sw" = "en") =>
    request<GroceryHome>(`/grocery/store/home?userId=${userId}&locale=${locale}`),

  enrollPackage: (body: {
    userId: string;
    packageId: string;
    address: string;
    preferredDayOfWeek?: number;
    preferredDayOfMonth?: number;
    startNow?: boolean;
  }) =>
    request<{
      subscription: { id: string; status: string };
      firstOrder: { id: string; total: string } | null;
      firstPayment: { id: string } | null;
    }>("/grocery/subscriptions", {
      method: "POST",
      body: JSON.stringify({ ...body, channel: "WHATSAPP", startNow: body.startNow ?? true }),
    }),

  getMembershipSetup: (locale: "en" | "sw" = "en") =>
    request<MembershipSetup>(`/grocery/store/membership?locale=${locale}`),

  enrollMembership: (body: {
    userId: string;
    plan: "WEEKLY" | "MONTHLY";
    address: string;
    preferredDayOfWeek?: number;
    preferredDayOfMonth?: number;
    defaultBasket: { productId: string; quantity: number }[];
    startNow?: boolean;
  }) =>
    request<{
      subscription: { id: string; status: string };
      firstOrder: { id: string; total: string; orderType?: string } | null;
      firstPayment: { id: string } | null;
      pricing?: { total: number; discountPercent: number; discountAmount: number; freeDelivery: boolean };
      deliverySchedule?: string;
      message?: string;
    }>("/grocery/store/membership", {
      method: "POST",
      body: JSON.stringify({ ...body, channel: "WHATSAPP", startNow: body.startNow ?? true }),
    }),

  listUserSubscriptions: (userId: string) =>
    request<Subscription[]>(`/grocery/subscriptions?userId=${userId}`),

  pauseSubscription: (id: string, weeks: number) =>
    request<unknown>(`/grocery/subscriptions/${id}/pause`, {
      method: "POST",
      body: JSON.stringify({ weeks }),
    }),

  updateSubscriptionBasket: (id: string, items: { productId: string; quantity: number }[]) =>
    request<unknown>(`/grocery/subscriptions/${id}/basket`, {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  getSubscriptionUpcoming: (id: string) =>
    request<{
      canEditBasket: boolean;
      cutoffAt: string | null;
      nextRunAt: string | null;
    }>(`/grocery/subscriptions/${id}/upcoming`),

  listRestaurantMenu: (slot: "BREAKFAST" | "LUNCH" | "DINNER") =>
    request<MenuItem[]>(`/restaurant/menu?slot=${slot}`),

  listSlots: (locale: "en" | "sw" = "en") =>
    request<
      Array<{
        slot: string;
        label: string;
        hours: string;
        orderWindow: string;
        deliversFor: string;
        status: "OPEN" | "CLOSED";
      }>
    >(`/restaurant/slots?locale=${locale}`),

  createOrder: (body: {
    userId: string;
    module: BusinessModule;
    items: { productId?: string; menuItemId?: string; quantity: number }[];
    address?: string;
    mealSlot?: "BREAKFAST" | "LUNCH" | "DINNER";
  }) =>
    request<{ id: string; total: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({ ...body, channel: "WHATSAPP" }),
    }),

  getUserOrders: (userId: string) =>
    request<Array<{ id: string; module: string; status: string; total: string; orderType?: string | null }>>(
      `/orders?userId=${userId}`
    ),

  createPayment: (orderId: string, locale: "en" | "sw" = "en") =>
    request<{
      payment: { id: string; amount: string; reference: string };
      instructions: {
        lipaNamba: string;
        name: string;
        amount: string;
        reference: string;
        steps: string;
        qrPayload?: string;
      };
      qrDataUrl?: string;
    }>(`/payments?locale=${locale}`, { method: "POST", body: JSON.stringify({ orderId }) }),

  submitPayment: (paymentId: string, reference: string) =>
    request<unknown>("/payments/submit", {
      method: "POST",
      body: JSON.stringify({ paymentId, reference }),
    }),
};
