# API Contracts

`GET /api/stockup` returns warehouses, showcase products with bin-level quantities, orders, active tasks, and movement history. It also seeds the deterministic `STOCKUP2026` demo catalog on an empty database.

`POST /api/stockup` accepts:

- `createOrder`: `{ action, customerName, items: [{ productId, quantity }] }`
- `confirmPick`: `{ action, itemId, barcode }`
- `reportMissing`: `{ action, itemId }`

Every write returns `{ ok, result, state }`. Errors return `{ error }` with a non-2xx status. Quantities are positive bounded integers; IDs are resolved server-side; barcodes are compared server-side.
