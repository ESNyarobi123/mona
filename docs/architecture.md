# Monana — Architecture

## Branding

| UI branch | Product name | `BusinessModule` | Domain folder |
|-----------|--------------|------------------|---------------|
| `/restaurant` | **Restaurant** | `RESTAURANT` | `services/restaurant` |
| `/grocery` | **Grocery** | `GROCERY` | `services/grocery` |

## One backend (NOT split)

Everything shares:

- `User`, `Wallet`, `Order`, `Payment`, `BotSession`
- `services/orders`, `services/payment`, `services/notifications`

Orders are tagged with `module: RESTAURANT | GROCERY` — same table, same payment flow.

```
Customer (Web or WhatsApp)
        │
        ├─► /restaurant  (Restaurant)
        └─► /grocery     (Grocery)
                │
                ▼
        Next.js API (shared)
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
 RESTAURANT   GROCERY    shared
  module       module    orders/payments/wallet
```

## Grocery module

| Concept | Model / API |
|---------|-------------|
| Products (raw items) | `Product` · `GET /api/grocery/products` |
| Packages (weekly/monthly) | `GroceryPackage` · `GET /api/grocery/packages` |
| Subscriptions | `GrocerySubscription` · `/api/grocery/subscriptions` |
| Custom orders | `Order` with `module: GROCERY` |

## Restaurant module

| Concept | Model / API |
|---------|-------------|
| Menus | `Menu`, `MenuItem` · `GET /api/restaurant/menu` |
| Meal slots (asubuhi/mchana/usiku) | `MealSlot` · `GET /api/restaurant/slots` |
| Daily orders | `Order` + `mealSlot` |
| Kitchen queue | `KitchenQueue` · `GET /api/restaurant/kitchen` |

## Web UI (placeholders — build later)

```
apps/web/app/(customer)/
  restaurant/   page, menu, slots, checkout, orders
  grocery/      page, products, cart, checkout, orders
```

## Deprecated

- `FOOD` / `MARKET` enums → `RESTAURANT` / `GROCERY`
- `/api/food`, `/api/market` → redirect to grocery (legacy)
