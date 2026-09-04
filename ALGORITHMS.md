# Algorithms

## Warehouse allocation

Each warehouse receives a deterministic score based on full-order feasibility, SKU coverage, unit coverage, load, approximate walking distance, and stockout risk. A full-order warehouse receives the dominant bonus, so split fulfilment is avoided whenever possible. The selected explanation is persisted on the order.

## Indoor route

Bin coordinates are converted into walkable access nodes. The warehouse graph contains a check-in node, a vertical spine, row corridors, and bin-access edges; shelves have no traversable edges. Nearest Neighbor establishes the initial stop order, 2-opt improves it, and A* solves each corridor segment. A* falls back to Dijkstra when necessary. The path returns to check-in and distance is calculated from the emitted path.

## Intelligence

Replenishment uses available stock divided by deterministic demand velocity. Slotting compares pick frequency and travel distance. Co-purchase signals use order-item co-occurrence; no LLM participates in inventory, quantity, or route decisions.
