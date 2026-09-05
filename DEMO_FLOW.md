# Hackathon Demonstration Flow

Follow this exact step-by-step flow for a winning demonstration of StockUp:

1. **Customer Order & Razorpay Checkout**:
   - Open Customer panel (`ShopView`).
   - Add **Coca-Cola 750 ml**, **Maggi Masala Noodles**, **Harvest Gold Bread**, **Amul Taaza Milk**, **Farm Fresh Eggs**, and **Lay's Classic Salted** to basket.
   - Click **Pay with Razorpay**. Select UPI Instant or Test Card in the Razorpay Modal.
   - Click **Pay & Reserve Order**. The order (`ORD-0001058`) is created with atomic stock reservation.

2. **Network Map & Allocation Engine**:
   - Switch to **Admin** panel. Submit prefilled credentials (`NETWORK / STOCKADMIN / ADMIN100 / 2026`).
   - Open **Network Map**. View all 3 warehouses (`WH01`, `WH02`, `WH03`).
   - Open **Orders** tab. Inspect the deterministic allocation decision trail:
     > *"6/6 SKUs available · 100% unit coverage · 42% load · 184m A* route · no split required"*

3. **Indoor Warehouse Navigation**:
   - Click **WH02 BlueRoute Hub** on the Network Map.
   - The interactive SVG indoor map opens, showing check-in node `CP02`, row racks, bin stock status, and the turn-by-turn A* navigation route.

4. **Worker Execution & Barcode Verification**:
   - Switch to **Worker** panel. Submit WH02 credentials (`WH02 / STOCK02 / EMP1042 / 1234`).
   - Select task `PT-01058` from the queue and click **Start picking**.
   - View Naive vs Optimized distance metrics: `Naive: 280m → Optimized A*: 184m (34.3% saved)`.
   - Enter a wrong barcode (e.g. `COKEZERO750`) → System rejects: `WRONG PRODUCT — expected 8901764020012. Do not pick.`
   - Enter correct barcode (`8901764020012`) → System confirms pick, decrements stock on-hand & reserved, and appends `OUTWARD` movement.

5. **Item Not Found & Dynamic Rerouting**:
   - On the second item, click **Item Not Found**.
   - System records an inventory exception, reserves alternate bin stock (`WH02-R03-B024`), recalculates the remaining A* route, and updates the worker's destination seamlessly.

6. **Admin Audit Ledger & Intelligence**:
   - Switch back to **Admin** panel.
   - Open **Movements** tab to inspect the immutable audit log with employee attribution.
   - Open **Pick Waves** tab and click **Generate Pick Wave for WH02** to batch pending orders into wave `PW-0031`.
   - Open **Intelligence** tab to view Adaptive Slotting recommendations (`-35.7% travel saving`), Stockout Risk depletion velocity, Co-Purchase Affinity Matrix, and run **Simulate 25-order surge**.
