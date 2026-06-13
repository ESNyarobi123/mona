# Monana System

Food + Market ordering platform yenye **Web App** na **WhatsApp Bot**, zote zinatumia
**Next.js API** kama "core brain".

## Stack
- **Frontend + Backend:** Next.js (App Router) — `apps/web`
- **Database:** PostgreSQL + Prisma ORM — `prisma/`, `packages/db`
- **WhatsApp Bot:** Node.js + Baileys — `apps/bot`
- **Payments:** Manual Lipa Namba + QR (MVP), baadaye ZenoPay / Flutterwave

## Architecture

```
Customer
   │
   ▼
WhatsApp Bot / Web UI
   │
   ▼
Next.js API (CORE BRAIN)
   │
   ├── Database (PostgreSQL)
   ├── Payments
   ├── Orders Engine
   └── Notifications
```

## Folder structure

```
monana-system/
├── apps/
│   ├── web/        # Next.js (Customer + Admin)
│   ├── admin/      # (optional) standalone admin panel
│   └── bot/        # WhatsApp Bot (Baileys)
├── packages/
│   ├── db/         # Prisma client wrapper
│   ├── types/      # Shared TypeScript types
│   └── utils/      # Helpers, formatters
├── services/
│   ├── payment/        # Payment logic
│   ├── notifications/  # WhatsApp / SMS / email
│   └── orders/         # Business logic engine
├── prisma/         # schema.prisma
└── docs/           # architecture.md, flows.md
```

## Getting started

```bash
# 1. Install deps
npm install

# 2. Setup env
cp .env.example .env

# 3. Start database
docker compose up -d

# 4. Generate Prisma client + run migration
npm run db:generate
npm run db:migrate

# 5. Run web + bot
npm run dev:web
npm run dev:bot
```

## Deployment
- **Web:** VPS / Vercel
- **Bot:** VPS (PM2)
- **DB:** Supabase / VPS PostgreSQL
