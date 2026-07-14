# SmartERP Lite

SmartERP Lite is a portfolio ERP demo focused on a realistic procurement and inventory workflow: products, suppliers, purchase orders, goods receipt, stock movement ledger, sales orders, and operational reporting.

## Why this project exists

This is intentionally not a generic admin template. The main hiring signal is the end-to-end ERP flow:

- Purchase orders track ordered vs received quantities.
- Goods receipts create positive stock movements.
- Sales shipments create negative stock movements.
- Inventory reports are calculated from the stock ledger, not from a manually edited stock field.
- Inventory value uses weighted average cost from stock movements, so receipts with different unit costs are valued correctly.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Prisma schema for PostgreSQL/Supabase readiness

The current demo runs with seeded in-app data so a recruiter can open it without credentials or environment variables. The Prisma schema documents the intended production data model.

## Getting started

```bash
npm install
npx prisma db push
npx prisma generate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

`npx prisma generate` creates the local Prisma Client from `prisma/schema.prisma`. The app uses that generated client to query Supabase with TypeScript-aware model methods such as `prisma.product.findMany()`.

`npm run prisma:seed` clears and reloads demo ERP data in Supabase: products, suppliers, purchase orders, sales orders, and stock movements.

## Demo login

Use one of these seeded accounts:

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Admin | `admin@smarterp.test` | `admin123` | Dashboard, products, suppliers, purchase orders, goods receipt, sales, reports |
| Viewer | `viewer@smarterp.test` | `viewer123` | Dashboard and reports only |

The login uses Supabase Auth. The first successful login upserts a row into `UserProfile` so the app can resolve `ADMIN` vs `VIEWER` access from the database.

## How to use the demo

1. Sign in as Admin to see the full ERP workspace.
2. Open Products to add demo SKU master data.
3. Open Suppliers to add supplier master data.
4. Review Purchase Orders and Goods Receipt to see the procurement flow.
5. Open Sales to compare order fulfillment with available stock.
6. Open Reports to review inventory valuation, purchase exposure, sales totals, and the stock ledger.

Sign out and sign in as Viewer to verify the read-only experience. Viewer users only see dashboard and report routes.

## Current portfolio limits

This version is connected to Supabase Postgres through Prisma. Product and supplier additions are saved to the database through Next.js Server Actions. Those mutations call `requireAdmin()`, so a signed-in viewer cannot create master data even if they try to bypass the UI.

The current auth is Supabase email/password via HTTP-only cookies. Before running after a schema change, push the role table and regenerate the client:

```bash
npx prisma db push
npx prisma generate
```

For production, replace the hardcoded demo role mapping in `lib/auth.ts` with an admin-managed role assignment flow.

## Production direction

For a production SaaS version, connect `DATABASE_URL` to Supabase Postgres, run Prisma migrations, move seeded data into database records, and add managed auth with role-based authorization.
