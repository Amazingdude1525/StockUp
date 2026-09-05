# Database Architecture

StockUp enforces strict database integrity and location-addressed inventory tracking across multi-warehouse operations.

## Schema parity
- **Supabase PostgreSQL Schema**: `supabase/schema.sql` contains production-ready DDL with indexes, foreign keys, row check constraints, and Supabase client bindings (`lib/supabase.ts`).
- **Cloudflare D1 Schema**: `db/schema.ts` provides the equivalent SQLite schema for serverless execution.

## Tables & Relationships
- `warehouses`: Warehouse metadata, lat/long coordinates, load %, check-in codes (`WH01`, `WH02`, `WH03`).
- `bins`: Physical location hierarchy (`Warehouse → Row → Bin`, e.g., `WH02-R03-B014`) with x, y, width, height canvas coordinates and access nodes.
- `products`: Catalog items with SKU, barcode, category, pricePaise, and reorderPoint.
- `inventory_locations`: Physical stock ownership holding `quantity_on_hand` and `quantity_reserved`. Available quantity is derived as `quantity_on_hand - quantity_reserved`.
- `orders` & `order_items`: Customer orders with status state machine, allocation reason, and optional Razorpay payment reference.
- `inventory_reservations`: Transactional reservation records linked to exact inventory locations.
- `pick_tasks` & `pick_task_items`: Directed pick routes with sequence numbers, task status (`ASSIGNED`, `STARTED`, `IN_PROGRESS`, `COMPLETED`), and route JSON.
- `pick_waves`: Grouped batch pick waves (`PW-0031`) with aggregated order codes and route metrics.
- `stock_movements`: Immutable append-only audit trail logging `INWARD`, `OUTWARD`, `TRANSFER`, `ADJUSTMENT`, and `RESERVATION_RELEASE` operations with employee code and server timestamp.
- `staff_access` & `staff_sessions`: Operational staff identities with PBKDF2-SHA256 hashed credentials and token session expiration.
