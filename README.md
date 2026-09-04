# StockUp

**Google Maps for Warehouse Fulfilment.** StockUp knows where stock is, decides which warehouse should fulfil an order, and guides the picker through a walkable indoor route.

## Run locally

```bash
npm install
npm run db:generate
npx wrangler d1 execute site-creator-d1 --local --file drizzle/0000_dapper_gressill.sql --config wrangler.jsonc
npm run dev
```

The database seeds itself deterministically on first API access. The showcase includes 3 warehouses, 72 bins, 600 catalog SKUs, operational inventory, movement history, and worker credentials represented by `EMP-1042` in the demo workflow.

## Important paths

- `app/api/stockup/route.ts`: validated operational commands and queries
- `components/stockup/stockup-app.tsx`: connected product surfaces
- `lib/algorithms/`: warehouse scoring and graph routing
- `db/schema.ts` and `drizzle/`: hosted D1 model and migration
- `supabase/schema.sql`: PostgreSQL/Supabase production reference

The Sites-hosted demo uses Cloudflare D1 because it is the native durable relational store in this environment. The logical model and service boundaries remain compatible with the supplied PostgreSQL schema.
