# StockUp Architecture

StockUp is a Vinext/Next App Router application deployed as a Cloudflare Worker. The UI is a single operational shell with distinct Network, Warehouse, Shop, Orders, Inventory, Worker, Movement, and Intelligence surfaces. All authoritative operational state is served through `/api/stockup` from D1; browser state is limited to navigation, map zoom, search text, and the unsubmitted cart.

The service layer validates commands, allocates a warehouse deterministically, reserves bin-level stock, creates pick tasks, verifies barcodes, reroutes exceptions, and appends stock movements. Algorithms are isolated under `lib/algorithms`. The production PostgreSQL/Supabase reference schema is in `supabase/schema.sql`; the hosted demo uses the equivalent D1 schema in `db/schema.ts`.

Data flow: customer cart → allocation score → atomic reservation batch → pick task and route → verified pick → on-hand/reserved update → immutable movement → order status.
