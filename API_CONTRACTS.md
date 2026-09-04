# API Contracts

`GET /api/stockup` returns warehouses, showcase products with bin-level quantities, orders, active tasks, and movement history. It also seeds the deterministic `STOCKUP2026` demo catalog and hashed staff credentials on an empty database.

`POST /api/stockup` accepts:

- `staffLogin`: `{ action, warehouseCode, warehousePasscode, employeeCode, pin }`
- `staffLogout`: `{ action, sessionToken }`
- `createOrder`: `{ action, customerName, items: [{ productId, quantity }] }`
- `startTask`: `{ action, taskId, sessionToken }`
- `confirmPick`: `{ action, itemId, barcode, sessionToken }`
- `reportMissing`: `{ action, itemId, sessionToken }`
- `transferInventory`: `{ action, sourceInventoryId, destinationLocationCode, quantity, sessionToken }`
- `simulateSurge`: `{ action, sessionToken }`

Every write returns `{ ok, result, state }`. Errors return `{ error }` with a non-2xx status. Quantities, locations, roles, warehouse scope, task state, and barcodes are validated server-side.
