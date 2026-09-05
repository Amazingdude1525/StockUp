# API Contracts

StockUp provides validated REST endpoints serving all product surfaces.

## GET `/api/stockup`
Returns current operational state:
- `warehouses`: Status, load %, active orders, low stock counts.
- `products`: Catalog items and physical location inventory mappings (`onHand`, `reserved`, `available`).
- `orders`: All live customer orders, status state, allocation reasoning, item count, payment ID.
- `tasks`: Active worker pick tasks with sequence, status, route JSON, naive distance, optimized distance, and saving percentage.
- `pickWaves`: Active wave batches with batched order codes and distance metrics.
- `copurchaseAffinities`: Co-occurrence pairs with support, confidence %, and storage recommendations.
- `movements`: Recent immutable stock movements.

## POST `/api/stockup`
Accepts JSON payload `{ action, ... }`:
- `staffLogin`: `{ action: "staffLogin", warehouseCode, warehousePasscode, employeeCode, pin }` → Returns staff session token.
- `staffLogout`: `{ action: "staffLogout", sessionToken }` → Deletes active session.
- `createOrder`: `{ action: "createOrder", items: [{ productId, quantity }], customerName }` → Executes allocation engine & transactional stock reservation.
- `createPickWave`: `{ action: "createPickWave", warehouseCode, sessionToken }` → Groups pending orders into Pick Wave (`PW-0031`).
- `startTask`: `{ action: "startTask", taskId, sessionToken }` → Marks task `STARTED` and order `PICKING`.
- `confirmPick`: `{ action: "confirmPick", itemId, barcode, sessionToken }` → Verifies barcode; updates `quantity_on_hand` and `quantity_reserved`, appends `OUTWARD` movement.
- `reportMissing`: `{ action: "reportMissing", itemId, sessionToken }` → Logs exception, reserves alternate bin stock, recalculates A* route.
- `transferInventory`: `{ action: "transferInventory", sourceInventoryId, destinationLocationCode, quantity, sessionToken }` → Performs atomic intra-warehouse transfer & appends `TRANSFER` movement.
- `simulateSurge`: `{ action: "simulateSurge", sessionToken }` → Generates 25 simulated orders in database (`isSimulated = true`).

## POST `/api/razorpay`
Accepts JSON payload:
- `createRazorpayOrder`: `{ action: "createRazorpayOrder", amountPaise, customerName }` → Returns test mode order ID & Key ID `rzp_test_stockup2026`.
- `verifyPayment`: `{ action: "verifyPayment", paymentId, orderId }` → Validates payment signature in test mode.
