import { prisma } from "@monana/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Platform-wide admin overview KPIs */
export async function getOverviewStats() {
  const today = startOfToday();

  const [
    ordersTotal,
    ordersToday,
    ordersPending,
    paymentsAwaiting,
    paymentsPending,
    usersTotal,
    restaurantOrdersToday,
    groceryOrdersToday,
    recentOrders,
    recentPayments,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } } }),
    prisma.payment.count({ where: { status: "AWAITING_CONFIRMATION" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.order.count({ where: { module: "RESTAURANT", createdAt: { gte: today } } }),
    prisma.order.count({ where: { module: "GROCERY", createdAt: { gte: today } } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true, payment: true },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["AWAITING_CONFIRMATION", "PENDING"] } },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { order: true, user: true },
    }),
  ]);

  const revenueToday = await prisma.order.aggregate({
    where: { createdAt: { gte: today }, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });

  return {
    ordersTotal,
    ordersToday,
    ordersPending,
    paymentsAwaiting,
    paymentsPending,
    usersTotal,
    restaurantOrdersToday,
    groceryOrdersToday,
    revenueToday: Number(revenueToday._sum.total ?? 0),
    recentOrders,
    recentPayments,
  };
}

/** Restaurant module dashboard stats */
export async function getRestaurantStats() {
  const today = startOfToday();

  const [menuItems, menus, kitchenActive, ordersToday, ordersPending, revenueToday, kitchenQueue, breakfastToday, lunchToday, dinnerToday, inProgressToday, deliveredToday] =
    await Promise.all([
      prisma.menuItem.count(),
      prisma.menu.count({ where: { active: true } }),
      prisma.kitchenQueue.count({ where: { status: { in: ["WAITING", "COOKING"] } } }),
      prisma.order.count({ where: { module: "RESTAURANT", createdAt: { gte: today } } }),
      prisma.order.count({
        where: { module: "RESTAURANT", status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } },
      }),
      prisma.order.aggregate({
        where: { module: "RESTAURANT", createdAt: { gte: today }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.kitchenQueue.findMany({
        where: { status: { in: ["WAITING", "COOKING", "READY"] } },
        include: { order: { include: { user: true, items: true } } },
        orderBy: [{ mealSlot: "asc" }, { position: "asc" }],
        take: 10,
      }),
      prisma.order.count({
        where: { module: "RESTAURANT", mealSlot: "BREAKFAST", createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: { module: "RESTAURANT", mealSlot: "LUNCH", createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: { module: "RESTAURANT", mealSlot: "DINNER", createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: {
          module: "RESTAURANT",
          createdAt: { gte: today },
          status: { in: ["PREPARING", "ON_THE_WAY", "CONFIRMED"] },
        },
      }),
      prisma.order.count({
        where: { module: "RESTAURANT", createdAt: { gte: today }, status: "DELIVERED" },
      }),
    ]);

  const recentRestaurantOrders = await prisma.order.findMany({
    where: { module: "RESTAURANT" },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true, kitchenQueue: true },
  });

  return {
    menuItems,
    menus,
    kitchenActive,
    ordersToday,
    ordersPending,
    revenueToday: Number(revenueToday._sum.total ?? 0),
    kitchenQueue,
    ordersBySlot: {
      BREAKFAST: breakfastToday,
      LUNCH: lunchToday,
      DINNER: dinnerToday,
    },
    ordersInProgress: inProgressToday,
    ordersDelivered: deliveredToday,
    recentOrders: recentRestaurantOrders,
  };
}

/** Grocery module dashboard stats */
export async function getGroceryStats() {
  const today = startOfToday();

  const [products, packages, categories, subscriptionsActive, subscriptionsDue, membershipMembers, ordersToday, ordersOnDemandToday, ordersSubscriptionToday, ordersPending, revenueToday] =
    await Promise.all([
      prisma.product.count({ where: { module: "GROCERY" } }),
      prisma.groceryPackage.count({ where: { active: true } }),
      prisma.category.count({ where: { module: "GROCERY" } }),
      prisma.grocerySubscription.count({ where: { status: "ACTIVE" } }),
      prisma.grocerySubscription.count({ where: { status: "ACTIVE", nextRunAt: { lte: new Date() } } }),
      prisma.grocerySubscription.count({
        where: {
          status: { not: "CANCELLED" },
          package: { name: { contains: "Uanachama" } },
        },
      }),
      prisma.order.count({ where: { module: "GROCERY", createdAt: { gte: today } } }),
      prisma.order.count({ where: { module: "GROCERY", orderType: "ON_DEMAND", createdAt: { gte: today } } }),
      prisma.order.count({ where: { module: "GROCERY", orderType: "SUBSCRIPTION", createdAt: { gte: today } } }),
      prisma.order.count({
        where: { module: "GROCERY", status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } },
      }),
      prisma.order.aggregate({
        where: { module: "GROCERY", createdAt: { gte: today }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
    ]);

  const [recentOrders, recentSubscriptions] = await Promise.all([
    prisma.order.findMany({
      where: { module: "GROCERY" },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: true, items: true },
    }),
    prisma.grocerySubscription.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { package: true, user: true },
    }),
  ]);

  return {
    products,
    packages,
    categories,
    units: await prisma.unitDefinition.count(),
    subscriptionsActive,
    subscriptionsDue,
    membershipMembers,
    ordersToday,
    ordersOnDemandToday,
    ordersSubscriptionToday,
    ordersPending,
    revenueToday: Number(revenueToday._sum.total ?? 0),
    recentOrders,
    recentSubscriptions,
  };
}
