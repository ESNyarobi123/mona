import { prisma, type MealSlot } from "@monana/db";
import { assertActiveUnit } from "@monana/grocery";

// Restaurant module (Monana Food): menus, meal slots, daily orders, kitchen queue.

export async function listMenus() {
  return prisma.menu.findMany({
    where: { active: true },
    include: { items: { where: { available: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listMenuItems(mealSlot?: MealSlot) {
  return prisma.menuItem.findMany({
    where: {
      available: true,
      ...(mealSlot ? { mealSlots: { has: mealSlot } } : {}),
    },
    include: { menu: true },
    orderBy: { name: "asc" },
  });
}

export async function createMenuItem(data: {
  menuId: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  categoryId?: string;
  imageUrl?: string;
  mealSlots: MealSlot[];
  available?: boolean;
}) {
  const unit = data.unit ?? "PIECE";
  await assertActiveUnit(unit, "RESTAURANT");
  return prisma.menuItem.create({ data: { ...data, unit } });
}

/** Admin: all menu items */
export async function listAllMenuItems() {
  return prisma.menuItem.findMany({
    include: { menu: true, category: true },
    orderBy: { name: "asc" },
  });
}

export async function updateMenuItem(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    mealSlots: MealSlot[];
    available: boolean;
    unit: string;
    categoryId: string | null;
  }>
) {
  if (data.unit) await assertActiveUnit(data.unit, "RESTAURANT");
  return prisma.menuItem.update({ where: { id }, data });
}

export async function listAllMenus() {
  return prisma.menu.findMany({
    include: { items: true },
    orderBy: { name: "asc" },
  });
}

export async function createMenu(data: { name: string; description?: string; active?: boolean }) {
  return prisma.menu.create({ data });
}

export async function updateMenu(id: string, data: Partial<{ name: string; description: string | null; active: boolean }>) {
  return prisma.menu.update({ where: { id }, data });
}

export async function getMenuItemById(id: string) {
  return prisma.menuItem.findUnique({ where: { id }, include: { menu: true, category: true } });
}

export async function deleteMenuItem(id: string) {
  return prisma.menuItem.update({ where: { id }, data: { available: false } });
}

export { enqueueKitchen, listKitchenQueue, updateKitchenStatus } from "./kitchen-queue";
export {
  getRestaurantSlotTicker,
  getMealSlotStatus,
  getMealSlotDefinitions,
  assertMealSlotOpen,
  formatOrderWindow,
  isSlotOpen,
  buildMealSlotDefinitions,
  MEAL_SLOT_WINDOWS,
  DEFAULT_MEAL_SLOT_WINDOWS,
  type RestaurantSlotTickerData,
  type RestaurantSlotTickerItem,
  type MealSlotDefinition,
  type MealSlotStatus,
  type MealSlotWindow,
} from "./meal-slots";
export {
  getMealSlotWindows,
  updateMealSlotWindows,
  getMealSlotSettingsPayload,
  validateMealSlotWindows,
} from "./meal-slot-settings";
