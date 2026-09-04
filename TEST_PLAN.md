# Test Plan

- Search by name, SKU, barcode, and location returns the same inventory rows as the database.
- A valid cart creates one order, item rows, reservations, one allocation, and one task.
- Allocation prefers a full-order low-load warehouse and persists its explanation.
- Conditional reservation updates prevent available stock from becoming negative.
- Wrong barcode returns 400 and changes no inventory or task state.
- Verified pick decrements on-hand and reserved equally, consumes the reservation, and appends OUTWARD.
- Missing item moves the reservation to an eligible alternate bin or marks EXCEPTION.
- A route starts/ends at check-in, follows only graph edges, and 2-opt is no worse than the initial tour.
- Low stock is derived from available quantity and reorder point.
- Transfer tests must assert source decrease, destination increase, and one immutable movement in one transaction.
