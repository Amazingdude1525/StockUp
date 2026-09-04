# StockUp

**Google Maps for Warehouse Fulfilment.** StockUp knows where stock is, decides which warehouse should fulfil an order, and guides the picker through a walkable indoor route.

## Three connected panels

- **Customer:** search live stock, build a basket, checkout, and track the resulting order.
- **Network Admin:** inspect the three-warehouse network, allocation reasons, bin inventory, movements, transfers, and deterministic intelligence.
- **Warehouse Employee:** sign in to a warehouse task queue, follow an A* route, verify barcodes, and report missing stock.

The demo access form is prefilled. Network Admin uses `NETWORK / STOCKADMIN / ADMIN100 / 2026`; the WH02 picker uses `WH02 / STOCK02 / EMP1042 / 1234`. Credentials are validated server-side against PBKDF2 hashes, and operational commands require an expiring staff session.

## Run locally

```bash
npm install
npx wrangler d1 execute site-creator-d1 --local --file drizzle/0000_dapper_gressill.sql --config wrangler.jsonc
npx wrangler d1 execute site-creator-d1 --local --file drizzle/0001_staff_access.sql --config wrangler.jsonc
npm run dev
```

The database seeds itself deterministically on first API access. The showcase includes 3 warehouses, 72 bins, 600 catalog SKUs, operational inventory, movement history, and staff identities.

## Important paths

- `app/api/stockup/route.ts`: validated operational commands, authentication, and queries
- `components/stockup/stockup-app.tsx`: three connected product surfaces
- `lib/algorithms/`: warehouse scoring and graph routing
- `db/schema.ts` and `drizzle/`: hosted D1 model and migrations
- `supabase/schema.sql`: PostgreSQL/Supabase production reference

The Sites-hosted demo uses Cloudflare D1 because it is the native durable relational store in this environment. The logical model and service boundaries remain compatible with the supplied PostgreSQL schema.
