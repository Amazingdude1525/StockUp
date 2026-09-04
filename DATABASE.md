# Database

Inventory is stored per physical bin, never on the product row. `inventory_locations` owns on-hand and reserved quantities. Available quantity is computed as `on_hand - reserved`. Products may occupy many bins and warehouses.

Orders reference line items, reservations, and pick tasks. Every pick task item points to the exact reserved inventory location. Missing-item rerouting moves the reservation to an alternate bin before changing the task destination. Stock movements are append-only application records containing product, warehouse, source/destination, order, employee, reference, and server timestamp.

`staff_access` stores warehouse and employee credentials as PBKDF2-SHA256 hashes; plaintext credentials are never persisted. `staff_sessions` stores only SHA-256 token hashes with an eight-hour expiry. Picker and manager operations are scoped to their warehouse, while network actions require the Network Admin role.

Hosted migrations are maintained in `drizzle/`. The Supabase/PostgreSQL reference adds row checks, indexes, and transaction function boundaries for deployments that use Supabase directly.
