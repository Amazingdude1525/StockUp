# Algorithmic Engineering

StockUp relies strictly on deterministic algorithms for inventory, allocation, routing, and operational intelligence.

## 1. Warehouse Allocation Engine (`lib/algorithms/allocation.ts`)
Calculates a deterministic score for each warehouse based on weighted metrics:
- Full-order availability (dominant bonus +1000)
- SKU coverage ratio (+300)
- Unit coverage ratio (+200)
- Warehouse workload penalty (-150)
- Approximate pick walking distance (-100)
- Stockout risk penalty (-120)

Returns the selected warehouse along with human-readable decision reasoning ("WHY WH02").

## 2. Split Fulfilment Engine (`lib/algorithms/splitFulfilment.ts`)
If no single warehouse has 100% SKU coverage, a greedy set-cover algorithm selects the minimum combination of warehouses (preferring 2 over 3) to fulfill all requested items without overselling.

## 3. Indoor Corridor Route & Pathfinding (`lib/algorithms/routing.ts`)
- **Walkable Corridor Graph**: Shelves are non-traversable obstacles. The navigation graph consists of check-in nodes, main vertical spines, aisle access nodes, and bin target nodes.
- **Initial Tour**: Nearest Neighbor orders visit stops.
- **Local Optimization**: 2-Opt iteratively swaps path segments until cost stabilizes.
- **Segment Pathfinding**: A* calculates the shortest valid corridor route using Euclidean heuristic `h(n) = sqrt((x_goal - x_n)^2 + (y_goal - y_n)^2)`. Falls back to Dijkstra if required.
- **Distance Savings Formula**: Computes Naive Distance (direct sequence) vs Optimized Distance and outputs Percentage Saved:
  $$\text{savingPercentage} = \frac{\text{naiveDistance} - \text{optimizedDistance}}{\text{naiveDistance}} \times 100$$

## 4. Pick Wave Batching (`lib/algorithms/pickWave.ts`)
Groups compatible pending orders in the same warehouse by time window and bin proximity into a Pick Wave (`PW-0031`), outputting a single unified A* pick route with distance savings.

## 5. Co-Purchase Intelligence Matrix (`lib/algorithms/copurchase.ts`)
Mines market basket co-occurrences from order history:
- Co-occurrence Count: Number of orders containing both Product A and Product B.
- Support: $P(A, B) = \frac{\text{count}(A, B)}{\text{totalOrders}}$
- Confidence: $P(B | A) = \frac{\text{count}(A, B)}{\text{count}(A)}$

Generates dynamic co-location storage recommendations ("Recommend placing Coke and Lays in adjacent bins").
