import {
  BusinessModule,
  MealSlot,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CUSTOMER_PHONE = "255711111111";
const ADMIN_PHONE = "255700000000";

/** Clear catalog + demo orders so `npm run db:seed` is safe to re-run */
async function resetCatalogAndDemoOrders() {
  await prisma.groceryPackingCheck.deleteMany();
  await prisma.groceryMarketRun.deleteMany();
  await prisma.hotPickManual.deleteMany();
  await prisma.kitchenQueue.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.grocerySubscription.deleteMany();
  await prisma.groceryPackage.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.hotProductsConfig.deleteMany();
}

async function seedUnits() {
  const defaults = [
    { id: "unit_piece", code: "PIECE", labelEn: "Piece", labelSw: "Kipande / Sahani", priceSuffix: "piece", quantitySuffixEn: "piece", quantitySuffixSw: "kipande", icon: "🍽️", sortOrder: 10 },
    { id: "unit_kg", code: "KG", labelEn: "Kilogram", labelSw: "Kilo (kg)", priceSuffix: "kg", quantitySuffixEn: "kg", quantitySuffixSw: "kilo", icon: "⚖️", sortOrder: 20 },
    { id: "unit_gram", code: "GRAM", labelEn: "Gram", labelSw: "Gramu (g)", priceSuffix: "g", quantitySuffixEn: "g", quantitySuffixSw: "gramu", icon: "⚖️", sortOrder: 30 },
    { id: "unit_litre", code: "LITRE", labelEn: "Litre", labelSw: "Lita", priceSuffix: "L", quantitySuffixEn: "L", quantitySuffixSw: "lita", icon: "🥤", sortOrder: 40 },
    { id: "unit_portion", code: "PORTION", labelEn: "Portion", labelSw: "Sehemu", priceSuffix: "portion", quantitySuffixEn: "portion", quantitySuffixSw: "sehemu", icon: "🥘", sortOrder: 50 },
    { id: "unit_pack", code: "PACK", labelEn: "Pack", labelSw: "Pakiti", priceSuffix: "pack", quantitySuffixEn: "pack", quantitySuffixSw: "pakiti", icon: "📦", sortOrder: 60 },
  ] as const;

  for (const unit of defaults) {
    await prisma.unitDefinition.upsert({
      where: { code: unit.code },
      create: { ...unit, isSystem: true, active: true, module: null },
      update: {},
    });
  }
}

async function seedDeliveryZones() {
  const defaults = [
    {
      name: "Kinondoni",
      nameSw: "Kinondoni",
      keywords: ["kinondoni", "kunduchi", "mbezi", "wazo", "makumbusho"],
      sortOrder: 10,
    },
    {
      name: "Masaki",
      nameSw: "Masaki",
      keywords: ["masaki", "slipway", "msasani", "oyster"],
      sortOrder: 20,
    },
    {
      name: "Tabata",
      nameSw: "Tabata",
      keywords: ["tabata", "segerea", "buguruni", "gongolamboto"],
      sortOrder: 30,
    },
  ];
  for (const d of defaults) {
    const exists = await prisma.deliveryZone.findFirst({ where: { name: d.name } });
    if (!exists) {
      await prisma.deliveryZone.create({ data: { ...d, active: true } });
    }
  }
}

async function main() {
  await seedUnits();
  console.log("🌱 Seeding Monana (RESTAURANT + GROCERY)...");

  await resetCatalogAndDemoOrders();

  // ─── Grocery categories & products (Monana Market) ───
  const catNafaka = await prisma.category.create({
    data: { name: "Nafaka & Unga", module: "GROCERY" },
  });
  const catMboga = await prisma.category.create({
    data: { name: "Mboga & Matunda", module: "GROCERY" },
  });
  const catMafuta = await prisma.category.create({
    data: { name: "Mafuta & Viungo", module: "GROCERY" },
  });
  const catVinywaji = await prisma.category.create({
    data: { name: "Vinywaji & Snacks", module: "GROCERY" },
  });

  const groceryProductData = [
    { name: "Mchele (Grade A)", price: 3200, unit: "KG" as const, categoryId: catNafaka.id, description: "Kilo 1" },
    { name: "Unga wa Sembe", price: 1800, unit: "KG" as const, categoryId: catNafaka.id },
    { name: "Unga wa Ngano", price: 2200, unit: "KG" as const, categoryId: catNafaka.id },
    { name: "Sukari", price: 3400, unit: "KG" as const, categoryId: catNafaka.id },
    { name: "Unga wa Dona", price: 1500, unit: "KG" as const, categoryId: catNafaka.id },
    { name: "Viazi", price: 1200, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Nyanya", price: 2200, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Vitunguu", price: 2800, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Karoti", price: 1800, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Sukuma Wiki", price: 800, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Ndizi", price: 1500, unit: "KG" as const, categoryId: catMboga.id },
    { name: "Mayai (tray 30)", price: 12000, unit: "PACK" as const, categoryId: catMboga.id },
    { name: "Mafuta ya Alizeti 1L", price: 4500, unit: "LITRE" as const, categoryId: catMafuta.id },
    { name: "Chumvi 1kg", price: 1200, unit: "KG" as const, categoryId: catMafuta.id },
    { name: "Maji ya Kinywaji 1.5L", price: 1500, unit: "LITRE" as const, categoryId: catVinywaji.id },
    { name: "Chai ya Maziwa (pakiti)", price: 3500, unit: "PACK" as const, categoryId: catVinywaji.id },
  ];

  const groceryProducts = await Promise.all(
    groceryProductData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          unit: p.unit,
          module: "GROCERY",
          categoryId: p.categoryId,
          available: true,
        },
      })
    )
  );

  const byName = (name: string) => groceryProducts.find((p) => p.name.startsWith(name))!;

  // ─── Grocery packages (kifurushi) ───
  const weeklyItems = [
    { productId: byName("Sukuma").id, quantity: 2 },
    { productId: byName("Nyanya").id, quantity: 1 },
    { productId: byName("Vitunguu").id, quantity: 1 },
    { productId: byName("Ndizi").id, quantity: 1 },
    { productId: byName("Maji").id, quantity: 2 },
  ];

  const monthlyItems = [
    { productId: byName("Mchele").id, quantity: 5 },
    { productId: byName("Unga wa Sembe").id, quantity: 3 },
    { productId: byName("Sukari").id, quantity: 2 },
    { productId: byName("Mafuta").id, quantity: 2 },
    { productId: byName("Chumvi").id, quantity: 1 },
    { productId: byName("Viazi").id, quantity: 3 },
  ];

  const familyWeeklyItems = [
    ...weeklyItems,
    { productId: byName("Mayai").id, quantity: 1 },
    { productId: byName("Karoti").id, quantity: 2 },
  ];

  await prisma.groceryPackage.createMany({
    data: [
      {
        name: "Kifurushi cha Wiki — Msingi",
        kind: "WEEKLY_BASKET",
        description: "Mboga, matunda na maji — utoaji kila Jumatano",
        price: 12500,
        orderCutoffHours: 48,
        freeDelivery: false,
        items: weeklyItems,
      },
      {
        name: "Kifurushi cha Wiki — Familia",
        kind: "WEEKLY_BASKET",
        description: "Wiki msingi + mayai na mboga zaidi",
        price: 18500,
        orderCutoffHours: 48,
        discountPercent: 3,
        items: familyWeeklyItems,
      },
      {
        name: "Kifurushi cha Mwezi — Pantry",
        kind: "MONTHLY_PANTRY",
        description: "Nafaka, sukari, mafuta — utoaji mara 2 kwa mwezi",
        price: 42000,
        deliveriesPerMonth: 2,
        discountPercent: 5,
        freeDelivery: true,
        orderCutoffHours: 72,
        items: monthlyItems,
      },
      {
        name: "Kifurushi cha Mwezi — Premium",
        kind: "MONTHLY_PANTRY",
        description: "Pantry kamili + vinywaji na viungo",
        price: 55000,
        deliveriesPerMonth: 2,
        discountPercent: 8,
        freeDelivery: true,
        orderCutoffHours: 72,
        items: [
          ...monthlyItems,
          { productId: byName("Chai").id, quantity: 2 },
          { productId: byName("Maji").id, quantity: 4 },
        ],
      },
    ],
  });

  // ─── Restaurant categories & menu (Monana Food) ───
  const catVyakula = await prisma.category.create({
    data: { name: "Vyakula vikuu", module: "RESTAURANT" },
  });
  const catVinywajiRest = await prisma.category.create({
    data: { name: "Vinywaji", module: "RESTAURANT" },
  });
  const catBreakfast = await prisma.category.create({
    data: { name: "Kifungua kinywa", module: "RESTAURANT" },
  });

  const menu = await prisma.menu.create({
    data: {
      name: "Menyu Kuu — Monana Food",
      description: "Chakula cha asubuhi, mchana na jioni",
      active: true,
    },
  });

  const menuItemsData = [
    { name: "Chai na Mandazi", price: 2500, unit: "PIECE" as const, categoryId: catBreakfast.id, mealSlots: ["BREAKFAST"] as MealSlot[] },
    { name: "Uji na Maharage", price: 3000, unit: "PIECE" as const, categoryId: catBreakfast.id, mealSlots: ["BREAKFAST"] as MealSlot[] },
    { name: "Mayai na Mkate", price: 3500, unit: "PIECE" as const, categoryId: catBreakfast.id, mealSlots: ["BREAKFAST"] as MealSlot[] },
    { name: "Wali wa Nyama", price: 5500, unit: "PIECE" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Pilau ya Kuku", price: 7500, unit: "PIECE" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Nyama ya kuchoma", price: 15000, unit: "KG" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[], description: "Bei kwa kilo" },
    { name: "Samaki wa kukaanga", price: 9000, unit: "PIECE" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Chips Mayai", price: 4000, unit: "PIECE" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Ugali na Dagaa", price: 6000, unit: "PIECE" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Supu ya Kuku", price: 4500, unit: "PORTION" as const, categoryId: catVyakula.id, mealSlots: ["LUNCH", "DINNER"] as MealSlot[] },
    { name: "Soda baridi", price: 2000, unit: "PIECE" as const, categoryId: catVinywajiRest.id, mealSlots: ["BREAKFAST", "LUNCH", "DINNER"] as MealSlot[] },
    { name: "Juice ya machungwa", price: 3500, unit: "LITRE" as const, categoryId: catVinywajiRest.id, mealSlots: ["BREAKFAST", "LUNCH", "DINNER"] as MealSlot[] },
  ];

  const menuItems = await Promise.all(
    menuItemsData.map((item) =>
      prisma.menuItem.create({
        data: {
          menuId: menu.id,
          name: item.name,
          description: item.description,
          price: item.price,
          unit: item.unit,
          categoryId: item.categoryId,
          mealSlots: item.mealSlots,
          available: true,
        },
      })
    )
  );

  await prisma.hotProductsConfig.createMany({
    data: [
      { module: "RESTAURANT", enabled: true, mode: "MANUAL", maxItems: 6 },
      { module: "GROCERY", enabled: true, mode: "AUTO", maxItems: 8, lookbackDays: 30 },
    ],
  });

  const hotMenu = menuItems.filter((m) =>
    ["Pilau ya Kuku", "Wali wa Nyama", "Chips Mayai"].includes(m.name)
  );
  await prisma.hotPickManual.createMany({
    data: hotMenu.map((m, i) => ({
      module: "RESTAURANT" as BusinessModule,
      menuItemId: m.id,
      sortOrder: i,
      badge: i === 0 ? "🔥 Maarufu" : undefined,
    })),
  });

  for (const row of [
    { key: "LIPA_NAMBA", value: "1234567890" },
    { key: "LIPA_NAMBA_NAME", value: "MONANA FOOD & MARKET" },
    { key: "WHATSAPP_SUPPORT", value: "255750599412" },
  ]) {
    await prisma.systemSetting.upsert({
      where: { key: row.key },
      update: { value: row.value },
      create: row,
    });
  }

  const bcrypt = await import("bcryptjs");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { role: "ADMIN", password: adminPassword, name: "Admin Monana" },
    create: {
      phone: ADMIN_PHONE,
      name: "Admin Monana",
      role: "ADMIN",
      password: adminPassword,
    },
  });

  const customer = await prisma.user.upsert({
    where: { phone: DEMO_CUSTOMER_PHONE },
    update: { password: customerPassword, name: "Mteja Demo" },
    create: {
      phone: DEMO_CUSTOMER_PHONE,
      name: "Mteja Demo",
      role: "CUSTOMER",
      password: customerPassword,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: customer.id },
    update: { balance: 50000 },
    create: { userId: customer.id, balance: 50000 },
  });

  const wali = menuItems.find((m) => m.name === "Wali wa Nyama")!;
  const pilau = menuItems.find((m) => m.name === "Pilau ya Kuku")!;
  const mchele = byName("Mchele");

  const restaurantOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      module: "RESTAURANT",
      status: "DELIVERED",
      channel: "WEB",
      total: 13000,
      address: "Sinza Mori, Dar es Salaam",
      mealSlot: "LUNCH",
      items: {
        create: [
          { menuItemId: wali.id, name: wali.name, unit: wali.unit, quantity: 1, price: wali.price },
          { menuItemId: pilau.id, name: pilau.name, unit: pilau.unit, quantity: 1, price: pilau.price },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: restaurantOrder.id,
      userId: customer.id,
      amount: 13000,
      status: "PAID",
      reference: "SEED-PAY-001",
    },
  });

  const sukari = byName("Sukari");
  const sukuma = byName("Sukuma");
  const mafuta = byName("Mafuta");

  const groceryOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      module: "GROCERY",
      status: "DELIVERED",
      channel: "WEB",
      orderType: "ON_DEMAND",
      total: 21400,
      address: "Sinza Mori, Dar es Salaam",
      items: {
        create: [
          { productId: mchele.id, name: mchele.name, unit: mchele.unit, quantity: 2, price: mchele.price },
          { productId: sukari.id, name: sukari.name, unit: sukari.unit, quantity: 1, price: sukari.price },
          { productId: sukuma.id, name: sukuma.name, unit: sukuma.unit, quantity: 3, price: sukuma.price },
        ],
      },
    },
  });

  const groceryOrder2 = await prisma.order.create({
    data: {
      userId: customer.id,
      module: "GROCERY",
      status: "DELIVERED",
      channel: "WHATSAPP",
      orderType: "ON_DEMAND",
      total: 13500,
      address: "Mbezi Beach",
      items: {
        create: [
          { productId: mchele.id, name: mchele.name, unit: mchele.unit, quantity: 1, price: mchele.price },
          { productId: mafuta.id, name: mafuta.name, unit: mafuta.unit, quantity: 2, price: mafuta.price },
          { productId: sukuma.id, name: sukuma.name, unit: sukuma.unit, quantity: 2, price: sukuma.price },
        ],
      },
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        orderId: groceryOrder.id,
        userId: customer.id,
        amount: 21400,
        status: "PAID",
        reference: "SEED-PAY-002",
      },
      {
        orderId: groceryOrder2.id,
        userId: customer.id,
        amount: 13500,
        status: "PAID",
        reference: "SEED-PAY-003",
      },
    ],
  });

  const pendingRestaurant = await prisma.order.create({
    data: {
      userId: customer.id,
      module: "RESTAURANT",
      status: "PENDING",
      channel: "WHATSAPP",
      total: 4000,
      mealSlot: "DINNER",
      address: "Mbezi Beach",
      items: {
        create: [
          {
            menuItemId: menuItems.find((m) => m.name === "Chips Mayai")!.id,
            name: "Chips Mayai",
            unit: "PIECE",
            quantity: 1,
            price: 4000,
          },
        ],
      },
    },
  });

  await prisma.kitchenQueue.create({
    data: {
      orderId: pendingRestaurant.id,
      mealSlot: "DINNER",
      position: 1,
      status: "WAITING",
    },
  });

  const packages = await prisma.groceryPackage.findMany();
  const weeklyPkg = packages.find((p) => p.name.includes("Msingi"))!;

  await prisma.grocerySubscription.create({
    data: {
      userId: customer.id,
      packageId: weeklyPkg.id,
      frequency: "WEEKLY",
      status: "ACTIVE",
      address: "Sinza Mori, Dar es Salaam",
      preferredDayOfWeek: 3,
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      defaultBasket: weeklyItems,
    },
  });

  await seedDeliveryZones();

  console.log(`
✅ Seed completed
   Grocery: ${groceryProducts.length} products, ${packages.length} packages
   Restaurant: ${menuItems.length} menu items (menu: ${menu.name})
   Users:
     Admin    ${ADMIN_PHONE} / admin123
     Customer ${DEMO_CUSTOMER_PHONE} / demo1234 (wallet TZS 50,000)
   Demo orders: 3 (restaurant delivered, grocery confirmed, restaurant pending + kitchen queue)
`);
  console.log(`   Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
