"use client";

export type CartLine = {
  key: string;
  module: "RESTAURANT" | "GROCERY";
  productId?: string;
  menuItemId?: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
};

export type CartState = {
  lines: CartLine[];
  restaurantSlot?: "BREAKFAST" | "LUNCH" | "DINNER";
};

const CART_KEY = "monana_cart";

function readRaw(): CartState {
  if (typeof window === "undefined") return { lines: [] };
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { lines: [] };
    return JSON.parse(raw) as CartState;
  } catch {
    return { lines: [] };
  }
}

function write(state: CartState) {
  localStorage.setItem(CART_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("monana-cart"));
}

export function getCart(): CartState {
  return readRaw();
}

export function getCartCount(): number {
  return readRaw().lines.reduce((n, l) => n + l.quantity, 0);
}

export function setRestaurantSlot(slot: CartState["restaurantSlot"]) {
  const state = readRaw();
  write({ ...state, restaurantSlot: slot });
}

export function addToCart(line: Omit<CartLine, "key">) {
  const state = readRaw();
  const key = `${line.module}:${line.menuItemId ?? line.productId}`;
  const existing = state.lines.find((l) => l.key === key);
  if (existing) {
    existing.quantity += line.quantity;
  } else {
    state.lines.push({ ...line, key });
  }
  write(state);
}

export function updateQuantity(key: string, quantity: number) {
  const state = readRaw();
  if (quantity <= 0) {
    state.lines = state.lines.filter((l) => l.key !== key);
  } else {
    const row = state.lines.find((l) => l.key === key);
    if (row) row.quantity = quantity;
  }
  write(state);
}

export function removeFromCart(key: string) {
  const state = readRaw();
  state.lines = state.lines.filter((l) => l.key !== key);
  write(state);
}

export function clearCart() {
  write({ lines: [] });
}

export function cartTotal(state: CartState = readRaw()) {
  return state.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}
