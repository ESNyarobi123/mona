export * from "./schemas";

export type ID = string;

export type BusinessModule = "RESTAURANT" | "GROCERY";
/** @deprecated use BusinessModule */
export type OrderType = BusinessModule;

export type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

export type GroceryOrderType = "ON_DEMAND" | "SUBSCRIPTION";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type Channel = "WEB" | "WHATSAPP";

export interface CartItem {
  productId?: ID;
  menuItemId?: ID;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderInput {
  userId: ID;
  module: BusinessModule;
  channel: Channel;
  items: { productId?: ID; menuItemId?: ID; quantity: number }[];
  address?: string;
  note?: string;
  mealSlot?: MealSlot;
  subscriptionId?: ID;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
