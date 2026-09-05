# StockUp Architecture

StockUp is a high-performance Next.js App Router application built for e-commerce multi-warehouse inventory and location tracking ("Google Maps for Warehouse Fulfilment").

## Product Surfaces
1. **Customer Surface**: Product search, live bin-level stock availability, cart management, Razorpay Test Mode Payment Gateway checkout, and real-time order tracking.
2. **Network Admin Control**: Interactive network map across 3 hubs (WH01 Gurugram, WH02 Noida, WH03 Faridabad), deterministic warehouse allocation engine ("WHY WH02"), bin inventory inspection, Pick Wave generator, Adaptive Slotting, and Co-Purchase Intelligence.
3. **Warehouse Worker Surface**: Mobile-first picking queue, turn-by-turn A* graph routing with 2-opt optimization, barcode verification (`WRONG PRODUCT` vs `PICK VERIFIED`), and dynamic "Item Not Found" alternate-bin rerouting.

## Database & Persistence Layer
- Dual Database Architecture:
  - Reference PostgreSQL schema maintained in `supabase/schema.sql` and `lib/supabase.ts` for Supabase backend handling.
  - Durable D1 / SQLite relational schema in `db/schema.ts` for edge server execution.
- Transaction Safety: Atomic inventory reservation locks (`quantity_reserved`), immutable stock movement log (`stock_movements`), and PBKDF2 hashed operational staff authentication (`staff_access`).

## End-to-End Execution Flow
Customer Cart → Razorpay Test Payment → Deterministic Allocation Engine → Transactional Stock Reservation Batch → Pick Task Creation → A* Graph Route Calculation → Verified Worker Pick → Immutable OUTWARD Stock Movement.
