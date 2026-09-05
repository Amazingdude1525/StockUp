# Test Plan & Verification Matrix

StockUp includes automated and reproducible verification for all critical warehouse scenarios:

- **TEST 1: Global Search**:
  Search "coke" via UI or `Ctrl+K` shortcut → Returns exact physical locations (`WH01-R02-B014`, `WH02-R03-B008`) and live quantities.
- **TEST 2: Customer Order & Reservation**:
  Customer places order → Order created, inventory reserved (`quantity_reserved` increased, `quantity_available` decremented), warehouse allocated.
- **TEST 3: Concurrent Overselling Prevention**:
  Two concurrent orders request same stock → Transactional lock ensures available stock never becomes negative.
- **TEST 4: Verified Pick Confirmation**:
  Picker scans expected barcode → `quantity_on_hand` and `quantity_reserved` decremented equally, reservation marked `CONSUMED`, `OUTWARD` movement logged.
- **TEST 5: Wrong Barcode Prevention**:
  Picker scans mismatched barcode → Server returns 400 error (`WRONG PRODUCT`), no stock or task state changed.
- **TEST 6: Item Not Found Rerouting**:
  Picker clicks "Item Not Found" → Exception logged, reservation transferred to alternate bin, A* route recalculated.
- **TEST 7: Intra-Warehouse Stock Transfer**:
  Transfer stock between bins → Source decrements, destination increments, immutable `TRANSFER` movement created.
- **TEST 8: Low-Stock Alerts**:
  Available quantity <= reorder point → Location highlighted in red and listed under low-stock alerts.
- **TEST 9: Obstacle-Aware Routing**:
  A* pathfinder calculates route → Path follows only corridor nodes, never crossing blocked storage racks.
- **TEST 10: Multi-Stop TSP Optimization**:
  2-Opt optimization pipeline executes → Optimized distance <= Naive direct distance (`savingPercentage = ((naive - opt)/naive) * 100`).
- **TEST 11: Warehouse Allocation Scoring**:
  Allocation engine evaluates 3 warehouses → Selects full-order feasibility warehouse and outputs "WHY WH02" explanation.
- **TEST 12: Split Fulfilment Engine**:
  No single warehouse has full order → Greedy set-cover algorithm generates optimal split allocation recommendation (`WH01` + `WH03`).
