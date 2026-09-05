# StockUp

> **“Google Maps for Warehouse Fulfilment.”**

StockUp knows where stock is down to the exact bin, decides which warehouse should fulfil an order using deterministic allocation & split fulfilment, and guides workers through an obstacle-aware A* indoor navigation route.

---

## 🌟 Signature Features

1. **Location-Addressed Multi-Warehouse Inventory**:
   - 3 Warehouses (`WH01` Gurugram, `WH02` Noida, `WH03` Faridabad)
   - `Warehouse → Row → Bin` hierarchy (e.g. `WH02-R03-B014`)
   - 600 SKUs mapped across live physical bins.

2. **Deterministic Allocation & Split Fulfilment Engine**:
   - Evaluates full-order feasibility, SKU coverage, unit coverage, load %, pick distance, and stockout risk.
   - Outputs human-readable decision trail ("WHY WH02").
   - Greedy set-cover algorithm for split-fulfilment when no single warehouse has 100% stock.

3. **A* Indoor Route Pathfinder & 2-Opt TSP**:
   - Top-down SVG indoor warehouse floorplan.
   - Walkable corridor graph navigation (no shelf clipping).
   - Distance savings formula display: `((naiveDistance - optimizedDistance) / naiveDistance) * 100`.

4. **Razorpay Test Mode Integration**:
   - Customer panel integration with Razorpay Checkout Modal (UPI, Test Cards, NetBanking).

5. **Worker Verification & Dynamic Rerouting**:
   - Barcode wrong-pick prevention (`WRONG PRODUCT` vs `PICK VERIFIED`).
   - "Item Not Found" exception handling with automatic alternate bin reservation & route recalculation.

6. **Order Batching Pick Waves & Market Basket Intelligence**:
   - Group compatible pending orders into Pick Waves (`PW-0031`).
   - Adaptive Slotting travel savings calculator (`-35.7% travel`).
   - Market Basket Co-Purchase Affinity Matrix with Support $P(A, B)$ and Confidence $P(B|A)$.

---

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS, Lucide icons, custom responsive SVG canvas
- **Database**: Supabase PostgreSQL (`supabase/schema.sql` + `lib/supabase.ts`) & Cloudflare D1 (`db/schema.ts`)
- **Payments**: Razorpay Gateway (Test Mode)
- **Algorithms**: A* Pathfinding, Dijkstra fallback, 2-Opt TSP, Greedy Set-Cover Split Fulfilment, Market Basket Association Mining

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The database automatically seeds `STOCKUP2026` mock catalog, physical bins, inventory, and staff accounts on first access.

### Demo Credentials
- **Network Admin**: `NETWORK / STOCKADMIN / ADMIN100 / 2026`
- **WH02 Picker**: `WH02 / STOCK02 / EMP1042 / 1234`
- **Keyboard Shortcut**: `Ctrl / Cmd + K` for global inventory search.
