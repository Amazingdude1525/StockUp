// app/api/stockup/route.ts
import * as nodeCrypto from "node:crypto";

// lib/db/inMemoryD1.ts
var MemoryStatement = class _MemoryStatement {
  constructor(sql, params, dbStore) {
    this.sql = sql;
    this.params = params;
    this.dbStore = dbStore;
  }
  bind(...args) {
    return new _MemoryStatement(this.sql, args, this.dbStore);
  }
  async first() {
    const res = await this.all();
    return res.results[0] ?? null;
  }
  extractMainTable(sql) {
    let topSql = sql;
    while (/\([^()]*\)/.test(topSql)) {
      topSql = topSql.replace(/\([^()]*\)/g, " ");
    }
    const match = topSql.match(/\bfrom\s+([a-z0-9_]+)/i);
    if (match) return match[1].toLowerCase();
    const anyFrom = sql.match(/\bfrom\s+([a-z0-9_]+)/i);
    return anyFrom ? anyFrom[1].toLowerCase() : "";
  }
  async all() {
    const sqlLower = this.sql.toLowerCase().trim();
    const tableName = this.extractMainTable(this.sql);
    if (sqlLower.includes("count(*)") && !sqlLower.includes("from warehouses")) {
      const table2 = this.dbStore.get(tableName) || [];
      return { results: [{ count: table2.length }] };
    }
    const table = this.dbStore.get(tableName) || [];
    let rows = table.map((r) => ({ ...r }));
    if (tableName === "warehouses") {
      const orders = this.dbStore.get("orders") || [];
      const invLocs = this.dbStore.get("inventory_locations") || [];
      const products = this.dbStore.get("products") || [];
      rows = rows.map((w) => {
        const activeOrders = orders.filter(
          (o) => o.warehouse_id === w.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
        ).length;
        const lowStock = invLocs.filter((il) => {
          if (il.warehouse_id !== w.id) return false;
          const p = products.find((prod) => prod.id === il.product_id);
          const reorder = p?.reorder_point ?? 10;
          return (il.quantity_on_hand || 0) - (il.quantity_reserved || 0) <= reorder;
        }).length;
        return {
          ...w,
          active_orders: activeOrders,
          low_stock: lowStock
        };
      });
    }
    if (tableName === "inventory_locations") {
      const warehouses = this.dbStore.get("warehouses") || [];
      const bins = this.dbStore.get("bins") || [];
      rows = rows.map((il) => {
        const w = warehouses.find((wh) => wh.id === il.warehouse_id);
        const b = bins.find((bin) => bin.id === il.bin_id);
        return {
          ...il,
          warehouse_code: w?.code || il.warehouse_id,
          location_code: b?.location_code || il.bin_id,
          row_code: b?.row_code || "",
          bin_code: b?.code || "",
          x: b?.x ?? 0,
          y: b?.y ?? 0
        };
      });
    }
    if (tableName === "stock_movements") {
      const products = this.dbStore.get("products") || [];
      const bins = this.dbStore.get("bins") || [];
      const orders = this.dbStore.get("orders") || [];
      rows = rows.map((sm) => {
        const p = products.find((prod) => prod.id === sm.product_id);
        const b = bins.find((bin) => bin.id === (sm.destination_bin_id || sm.source_bin_id));
        const o = orders.find((ord) => ord.id === sm.order_id);
        return {
          ...sm,
          product_name: p?.name || sm.product_id,
          location_code: b?.location_code || "",
          order_code: o?.code || ""
        };
      });
    }
    if (tableName === "orders") {
      const warehouses = this.dbStore.get("warehouses") || [];
      const orderItems = this.dbStore.get("order_items") || [];
      rows = rows.map((o) => {
        const w = warehouses.find((wh) => wh.id === o.warehouse_id);
        const items = orderItems.filter((oi) => oi.order_id === o.id);
        const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        return {
          ...o,
          warehouse_code: w?.code || o.warehouse_id,
          item_count: itemCount
        };
      });
    }
    if (tableName === "pick_tasks") {
      const orders = this.dbStore.get("orders") || [];
      rows = rows.map((pt) => {
        const o = orders.find((ord) => ord.id === pt.order_id);
        return {
          ...pt,
          order_code: o?.code || ""
        };
      });
    }
    if (tableName === "pick_task_items") {
      const orderItems = this.dbStore.get("order_items") || [];
      const products = this.dbStore.get("products") || [];
      const invLocs = this.dbStore.get("inventory_locations") || [];
      const bins = this.dbStore.get("bins") || [];
      const pickTasks = this.dbStore.get("pick_tasks") || [];
      rows = rows.map((pti) => {
        const pt = pickTasks.find((t) => t.id === pti.pick_task_id);
        const oi = orderItems.find((item) => item.id === pti.order_item_id);
        const p = products.find((prod) => prod.id === (oi?.product_id || pti.product_id));
        const il = invLocs.find((loc) => loc.id === pti.inventory_location_id);
        const b = bins.find((bin) => bin.id === il?.bin_id);
        return {
          ...pti,
          pick_task_id: pti.pick_task_id,
          order_id: pt?.order_id || "",
          warehouse_id: pt?.warehouse_id || "",
          task_status: pt?.status || "",
          product_id: p?.id || oi?.product_id || "",
          product_name: p?.name || "",
          sku: p?.sku || "",
          barcode: p?.barcode || "",
          inventory_id: il?.id || pti.inventory_location_id,
          location_code: b?.location_code || "",
          row_code: b?.row_code || "",
          bin_code: b?.code || "",
          x: b?.x ?? 0,
          y: b?.y ?? 0
        };
      });
    }
    if (tableName === "staff_access") {
      if (this.params.length >= 2) {
        const [code, whCode] = this.params;
        rows = rows.filter((r) => r.code === code && r.warehouse_code === whCode);
      }
    }
    return { results: rows };
  }
  async run() {
    const sqlTrim = this.sql.trim();
    const sqlLower = sqlTrim.toLowerCase();
    if (sqlLower.startsWith("create table")) {
      const match = sqlTrim.match(/create table (?:if not exists )?([a-z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1].toLowerCase();
        if (!this.dbStore.has(tableName)) {
          this.dbStore.set(tableName, []);
        }
      }
    }
    if (sqlLower.startsWith("insert")) {
      const tableMatch = sqlTrim.match(/into\s+([a-z0-9_]+)\s*\(([^)]+)\)/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        const cols = tableMatch[2].split(",").map((c) => c.trim().toLowerCase());
        const table = this.dbStore.get(tableName) || [];
        const row = {};
        cols.forEach((col, idx) => {
          row[col] = this.params[idx] !== void 0 ? this.params[idx] : null;
        });
        const existingIdx = table.findIndex(
          (r) => (r.id && row.id ? r.id === row.id : Boolean(r.code && row.code && r.code === row.code))
        );
        if (existingIdx >= 0) {
          if (!sqlLower.includes("ignore")) {
            table[existingIdx] = { ...table[existingIdx], ...row };
          }
        } else {
          table.push(row);
        }
        this.dbStore.set(tableName, table);
      }
    }
    if (sqlLower.startsWith("update")) {
      const tableMatch = sqlTrim.match(/update\s+([a-z0-9_]+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        const table = this.dbStore.get(tableName) || [];
        if (this.params.length > 0) {
          const targetId = this.params[this.params.length - 1];
          const targetRow = table.find((r) => r.id === targetId || r.code === targetId);
          if (targetRow) {
            if (sqlLower.includes("quantity_on_hand=quantity_on_hand-")) {
              const qty = Number(this.params[0]) || 0;
              targetRow.quantity_on_hand = Math.max(0, (targetRow.quantity_on_hand || 0) - qty);
              targetRow.quantity_reserved = Math.max(0, (targetRow.quantity_reserved || 0) - qty);
            }
            if (sqlLower.includes("quantity_reserved=quantity_reserved+")) {
              const qty = Number(this.params[0]) || 0;
              targetRow.quantity_reserved = (targetRow.quantity_reserved || 0) + qty;
            }
            if (sqlLower.includes("status=")) {
              const statusMatch = sqlTrim.match(/status=['"]([^'"]+)['"]/i);
              if (statusMatch) {
                targetRow.status = statusMatch[1];
              } else if (this.params.length > 0) {
                targetRow.status = String(this.params[0] || "COMPLETED");
              }
            }
            if (sqlLower.includes("employee_code=?") && this.params.length > 0) {
              targetRow.employee_code = this.params[0];
            }
          }
        }
        this.dbStore.set(tableName, table);
      }
    }
    return { success: true };
  }
};
var InMemoryD1Database = class {
  constructor() {
    this.dbStore = /* @__PURE__ */ new Map();
  }
  prepare(sql) {
    return new MemoryStatement(sql, [], this.dbStore);
  }
  async batch(statements) {
    for (const stmt of statements) {
      await stmt.run();
    }
    return [];
  }
};
var globalMemoryDb = new InMemoryD1Database();
function getInMemoryD1() {
  return globalMemoryDb;
}

// lib/algorithms/allocation.ts
function selectWarehouse(candidates) {
  return candidates.map((w) => {
    const covered = w.items.filter((i) => i.available >= i.requested).length, total = w.items.length, full = covered === total, unitRatio = w.items.reduce((s, i) => s + Math.min(i.available, i.requested), 0) / Math.max(
      1,
      w.items.reduce((s, i) => s + i.requested, 0)
    ), distance = w.items.reduce((s, i) => s + i.approxDistance, 0), risk = w.items.filter((i) => i.available - i.requested < 5).length / Math.max(1, total), score = (full ? 1e3 : 0) + covered / Math.max(1, total) * 300 + unitRatio * 200 - w.loadPercent / 100 * 150 - Math.min(1, distance / 600) * 100 - risk * 120;
    return { ...w, full, covered, total, unitRatio, distance, risk, score };
  }).sort((a, b) => b.score - a.score);
}

// lib/algorithms/routing.ts
var euclidean = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function aStar(nodes, edges, startId, goalId) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const open = /* @__PURE__ */ new Set([startId]);
  const came = /* @__PURE__ */ new Map();
  const g = /* @__PURE__ */ new Map([[startId, 0]]);
  const goal = byId.get(goalId);
  if (!goal) return [];
  while (open.size) {
    const current = [...open].sort(
      (a, b) => (g.get(a) ?? Infinity) + euclidean(byId.get(a), goal) - ((g.get(b) ?? Infinity) + euclidean(byId.get(b), goal))
    )[0];
    if (current === goalId) {
      const path = [current];
      let cursor = current;
      while (came.has(cursor)) {
        cursor = came.get(cursor);
        path.unshift(cursor);
      }
      return path;
    }
    open.delete(current);
    for (const edge of edges.filter(
      (e) => !e.blocked && (e.from === current || e.bidirectional !== false && e.to === current)
    )) {
      const next = edge.from === current ? edge.to : edge.from;
      const tentative = (g.get(current) ?? Infinity) + edge.distance;
      if (tentative < (g.get(next) ?? Infinity)) {
        came.set(next, current);
        g.set(next, tentative);
        open.add(next);
      }
    }
  }
  return dijkstra(nodes, edges, startId, goalId);
}
function dijkstra(nodes, edges, startId, goalId) {
  const unvisited = new Set(nodes.map((n) => n.id));
  const dist = /* @__PURE__ */ new Map([[startId, 0]]);
  const prev = /* @__PURE__ */ new Map();
  while (unvisited.size) {
    const current = [...unvisited].sort(
      (a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity)
    )[0];
    if (!Number.isFinite(dist.get(current) ?? Infinity)) break;
    unvisited.delete(current);
    if (current === goalId) break;
    for (const e of edges.filter(
      (e2) => !e2.blocked && (e2.from === current || e2.bidirectional !== false && e2.to === current)
    )) {
      const next = e.from === current ? e.to : e.from;
      const alt = (dist.get(current) ?? 0) + e.distance;
      if (alt < (dist.get(next) ?? Infinity)) {
        dist.set(next, alt);
        prev.set(next, current);
      }
    }
  }
  if (!dist.has(goalId)) return [];
  const path = [goalId];
  let cursor = goalId;
  while (prev.has(cursor)) {
    cursor = prev.get(cursor);
    path.unshift(cursor);
  }
  return path;
}
var routeDistance = (route) => route.slice(1).reduce((d, p, i) => d + euclidean(route[i], p), 0);
function nearestNeighbor(start, stops) {
  const left = [...stops], route = [start];
  while (left.length) {
    const current = route.at(-1);
    left.sort((a, b) => euclidean(current, a) - euclidean(current, b));
    route.push(left.shift());
  }
  return [...route, start];
}
function twoOpt(route) {
  let best = [...route], improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++)
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1)
        ];
        if (routeDistance(candidate) + 1e-3 < routeDistance(best)) {
          best = candidate;
          improved = true;
        }
      }
  }
  return best;
}
function warehouseAStarRoute(stops) {
  const cp = { id: "CP", x: 60, y: 520 };
  const corridorYs = [170, 275, 380, 485, 520];
  const nodes = [
    cp,
    ...corridorYs.map((y) => ({ id: `S-${y}`, x: 85, y }))
  ];
  const edges = [
    { from: "CP", to: "S-520", distance: 25, bidirectional: true }
  ];
  for (let i = 1; i < corridorYs.length; i++)
    edges.push({
      from: `S-${corridorYs[i - 1]}`,
      to: `S-${corridorYs[i]}`,
      distance: corridorYs[i] - corridorYs[i - 1],
      bidirectional: true
    });
  stops.forEach((stop, i) => {
    const corridorY = stop.y + 65, access = { id: `A-${i}`, x: stop.x + 37, y: corridorY }, goal = { id: `G-${i}`, x: stop.x + 37, y: stop.y + 21 };
    nodes.push(access, goal);
    edges.push(
      {
        from: `S-${corridorY}`,
        to: access.id,
        distance: access.x - 85,
        bidirectional: true
      },
      { from: access.id, to: goal.id, distance: 44, bidirectional: true }
    );
  });
  const ordered = twoOpt(
    nearestNeighbor(
      cp,
      stops.map((s, i) => ({ ...s, id: `G-${i}`, x: s.x + 37, y: s.y + 21 }))
    )
  ).slice(1, -1);
  const ids = ["CP", ...ordered.map((p) => p.id), "CP"];
  const pathIds = [];
  for (let i = 1; i < ids.length; i++) {
    const segment = aStar(nodes, edges, ids[i - 1], ids[i]);
    pathIds.push(...segment.slice(i === 1 ? 0 : 1));
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return pathIds.map((id2) => byId.get(id2)).filter(Boolean);
}
function calculateRouteMetrics(stops) {
  const cp = { id: "CP", x: 60, y: 520 };
  const naivePoints = [cp, ...stops, cp];
  const naiveDistance = Math.round(routeDistance(naivePoints) * 0.1);
  const optimizedPath = warehouseAStarRoute(stops);
  const optimizedDistance = Math.round(routeDistance(optimizedPath) * 0.1);
  const savingPercentage = naiveDistance > 0 ? Math.max(
    0,
    Math.round(
      (naiveDistance - optimizedDistance) / naiveDistance * 1e3
    ) / 10
  ) : 0;
  return {
    naiveDistance,
    optimizedDistance,
    savingPercentage,
    path: optimizedPath
  };
}

// lib/algorithms/splitFulfilment.ts
function computeSplitFulfilment(candidates, requestedItems) {
  const remaining = new Map(
    requestedItems.map((item) => [item.productId, item.quantity])
  );
  const warehouseAssignments = [];
  const availableCandidates = [...candidates].sort((a, b) => a.loadPercent - b.loadPercent);
  for (const candidate of availableCandidates) {
    const assignedForThisWh = [];
    for (const item of candidate.items) {
      const needed = remaining.get(item.productId) ?? 0;
      if (needed > 0 && item.available > 0) {
        const allocated = Math.min(needed, item.available);
        assignedForThisWh.push({ productId: item.productId, quantity: allocated });
        remaining.set(item.productId, needed - allocated);
      }
    }
    if (assignedForThisWh.length > 0) {
      warehouseAssignments.push({
        warehouseId: candidate.id,
        warehouseCode: candidate.code,
        items: assignedForThisWh
      });
    }
    const allFulfilled = [...remaining.values()].every((rem) => rem === 0);
    if (allFulfilled) break;
  }
  const unfulfilled = [];
  for (const [productId, rem] of remaining.entries()) {
    if (rem > 0) {
      unfulfilled.push({ productId, quantity: rem });
    }
  }
  const isSplit = warehouseAssignments.length > 1;
  const reasonParts = warehouseAssignments.map(
    (wh) => `${wh.warehouseCode}: ${wh.items.map((i) => `SKU ${i.productId.slice(-4)} \xD7${i.quantity}`).join(", ")}`
  );
  const reason = isSplit ? `Split fulfilment required across ${warehouseAssignments.length} warehouses (${reasonParts.join(" | ")})` : warehouseAssignments.length === 1 ? `Full order fulfilled by ${warehouseAssignments[0].warehouseCode}` : "Insufficient inventory across network";
  return {
    isSplit,
    warehousesUsed: warehouseAssignments.length,
    allocations: warehouseAssignments,
    unfulfilledItems: unfulfilled,
    reason
  };
}

// lib/algorithms/pickWave.ts
function createPickWave(orders, waveSequenceNumber) {
  if (!orders.length) return null;
  const warehouseId = orders[0].warehouseId;
  const sameWarehouseOrders = orders.filter((o) => o.warehouseId === warehouseId);
  if (!sameWarehouseOrders.length) return null;
  const waveCode = `PW-${String(waveSequenceNumber).padStart(4, "0")}`;
  const orderIds = sameWarehouseOrders.map((o) => o.orderId);
  const orderCodes = sameWarehouseOrders.map((o) => o.code || o.orderCode);
  const allStops = [];
  sameWarehouseOrders.forEach((order) => {
    order.items.forEach((item, idx) => {
      allStops.push({
        id: `${order.orderId}-${idx}`,
        x: item.x,
        y: item.y,
        productId: item.productId,
        quantity: item.quantity
      });
    });
  });
  const checkin = { id: "CP", x: 60, y: 520 };
  const naivePoints = [checkin, ...allStops, checkin];
  const naiveDistance = Math.round(routeDistance(naivePoints) * 0.1);
  const optimizedPath = warehouseAStarRoute(allStops);
  const optimizedDistance = Math.round(routeDistance(optimizedPath) * 0.1);
  const savingPercentage = naiveDistance > 0 ? Math.max(0, Math.round((naiveDistance - optimizedDistance) / naiveDistance * 1e3) / 10) : 0;
  return {
    waveCode,
    warehouseId,
    orderIds,
    orderCodes,
    totalItems: allStops.length,
    route: optimizedPath.map((p) => ({ x: p.x, y: p.y })),
    naiveDistance,
    optimizedDistance,
    savingPercentage,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// lib/algorithms/copurchase.ts
function computeCoPurchaseMatrix(orderItems, totalOrdersCount) {
  if (!orderItems.length || totalOrdersCount <= 0) return [];
  const ordersMap = /* @__PURE__ */ new Map();
  const productCountMap = /* @__PURE__ */ new Map();
  orderItems.forEach((item) => {
    productCountMap.set(item.productId, (productCountMap.get(item.productId) ?? 0) + 1);
    if (!ordersMap.has(item.orderId)) {
      ordersMap.set(item.orderId, []);
    }
    const current = ordersMap.get(item.orderId);
    if (!current.some((p) => p.id === item.productId)) {
      current.push({ id: item.productId, name: item.productName });
    }
  });
  const pairCountMap = /* @__PURE__ */ new Map();
  for (const items of ordersMap.values()) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [a, b] = [items[i], items[j]].sort((x, y) => x.id.localeCompare(y.id));
        const key = `${a.id}:${b.id}`;
        if (!pairCountMap.has(key)) {
          pairCountMap.set(key, { count: 0, pA: a, pB: b });
        }
        pairCountMap.get(key).count += 1;
      }
    }
  }
  const results = [];
  for (const { count, pA, pB } of pairCountMap.values()) {
    const countA = productCountMap.get(pA.id) ?? 1;
    const countB = productCountMap.get(pB.id) ?? 1;
    const support = Math.round(count / totalOrdersCount * 1e3) / 1e3;
    const confidenceAtoB = Math.round(count / countA * 100);
    const confidenceBtoA = Math.round(count / countB * 100);
    const recommendation = `Recommend placing ${pA.name} and ${pB.name} in adjacent rows/bins (Ordered together in ${count} orders, ${confidenceAtoB}% affinity).`;
    results.push({
      productAId: pA.id,
      productAName: pA.name,
      productBId: pB.id,
      productBName: pB.name,
      coOccurrenceCount: count,
      support,
      confidenceAtoB,
      confidenceBtoA,
      recommendation
    });
  }
  return results.sort((x, y) => y.coOccurrenceCount - x.coOccurrenceCount);
}

// app/api/stockup/route.ts
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var getUUID = () => {
  try {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
  }
  try {
    if (nodeCrypto?.randomUUID) {
      return nodeCrypto.randomUUID();
    }
  } catch {
  }
  return Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
};
var id = (prefix) => `${prefix}-${getUUID()}`;
var hex = (bytes) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
async function hashCredential(value, salt) {
  try {
    const c = typeof globalThis !== "undefined" && globalThis.crypto?.subtle || nodeCrypto?.webcrypto?.subtle;
    if (c) {
      const material = await c.importKey(
        "raw",
        new TextEncoder().encode(value),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await c.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new TextEncoder().encode("stockup:" + salt),
          iterations: 1e3
        },
        material,
        256
      );
      return hex(bits);
    }
  } catch {
  }
  return nodeCrypto.createHash("sha256").update(value + ":" + salt).digest("hex");
}
async function hashToken(value) {
  try {
    const c = typeof globalThis !== "undefined" && globalThis.crypto?.subtle || nodeCrypto?.webcrypto?.subtle;
    if (c) {
      return hex(await c.digest("SHA-256", new TextEncoder().encode(value)));
    }
  } catch {
  }
  return nodeCrypto.createHash("sha256").update(value).digest("hex");
}
async function ensureAccessSchema(db) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS staff_access(code TEXT PRIMARY KEY,warehouse_code TEXT NOT NULL,warehouse_pass_hash TEXT NOT NULL,pin_hash TEXT NOT NULL,role TEXT NOT NULL,display_name TEXT NOT NULL,created_at TEXT NOT NULL)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS staff_sessions(token_hash TEXT PRIMARY KEY,staff_code TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(staff_code) REFERENCES staff_access(code) ON DELETE CASCADE)"
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_staff_sessions_expiry ON staff_sessions(expires_at)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS pick_waves(id TEXT PRIMARY KEY, code TEXT UNIQUE, warehouse_id TEXT, order_codes_json TEXT, total_items INTEGER, naive_distance REAL, optimized_distance REAL, saving_percentage REAL, created_at TEXT)"
    )
  ]);
  const existing = await db.prepare("SELECT COUNT(*) count FROM staff_access").first();
  if ((existing?.count ?? 0) > 0) return;
  const demo = [
    ["EMP1001", "WH01", "STOCK01", "1234", "PICKER", "Meera Singh"],
    ["EMP1042", "WH02", "STOCK02", "1234", "PICKER", "Ravi Kumar"],
    ["EMP1077", "WH03", "STOCK03", "1234", "WAREHOUSE_MANAGER", "Nisha Verma"],
    [
      "ADMIN100",
      "NETWORK",
      "STOCKADMIN",
      "2026",
      "NETWORK_ADMIN",
      "Arjun Kapoor"
    ]
  ];
  for (const [
    code,
    warehouseCode,
    warehousePass,
    pin,
    role,
    displayName
  ] of demo) {
    await db.prepare(
      "INSERT OR IGNORE INTO staff_access(code,warehouse_code,warehouse_pass_hash,pin_hash,role,display_name,created_at) VALUES(?,?,?,?,?,?,?)"
    ).bind(
      code,
      warehouseCode,
      await hashCredential(warehousePass, warehouseCode),
      await hashCredential(pin, code),
      role,
      displayName,
      now()
    ).run();
  }
}
async function staffLogin(db, body) {
  const code = String(body.employeeCode || "").trim().toUpperCase();
  const warehouseCode = String(body.warehouseCode || "").trim().toUpperCase();
  const staff = await db.prepare("SELECT * FROM staff_access WHERE code=? AND warehouse_code=?").bind(code, warehouseCode).first();
  if (!staff) throw new Error("Invalid warehouse or employee credentials.");
  const [warehousePassHash, pinHash] = await Promise.all([
    hashCredential(String(body.warehousePasscode || ""), warehouseCode),
    hashCredential(String(body.pin || ""), code)
  ]);
  if (warehousePassHash !== staff.warehouse_pass_hash || pinHash !== staff.pin_hash)
    throw new Error("Invalid warehouse or employee credentials.");
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1e3).toISOString();
  await db.prepare(
    "INSERT INTO staff_sessions(token_hash,staff_code,expires_at,created_at) VALUES(?,?,?,?)"
  ).bind(await hashToken(token), code, expiresAt, now()).run();
  return {
    token,
    staffCode: code,
    displayName: staff.display_name,
    role: staff.role,
    warehouseCode: warehouseCode === "NETWORK" ? null : warehouseCode,
    expiresAt
  };
}
async function requireStaff(db, body, roles) {
  const token = String(body.sessionToken || "");
  if (!token) throw new Error("Staff sign-in required.");
  const row = await db.prepare(
    "SELECT a.* FROM staff_sessions s JOIN staff_access a ON a.code=s.staff_code WHERE s.token_hash=? AND s.expires_at>?"
  ).bind(await hashToken(token), now()).first();
  if (!row || !roles.includes(row.role))
    throw new Error(
      "This staff account is not permitted to perform that action."
    );
  return {
    staffCode: row.code,
    displayName: row.display_name,
    role: row.role,
    warehouseCode: row.warehouse_code === "NETWORK" ? null : row.warehouse_code
  };
}
async function staffLogout(db, body) {
  if (body.sessionToken)
    await db.prepare("DELETE FROM staff_sessions WHERE token_hash=?").bind(await hashToken(String(body.sessionToken))).run();
  return { signedOut: true };
}
var showcase = [
  ["P001", "COKE750", "8901764020012", "Coca-Cola 750 ml", "Beverages", 4500],
  ["P002", "MAGGI560", "8901058851234", "Maggi Masala Noodles", "Pantry", 7800],
  [
    "P003",
    "BREAD400",
    "8906001123456",
    "Harvest Gold Bread 400g",
    "Bakery",
    5e3
  ],
  ["P004", "MILK1L", "8902080124319", "Amul Taaza Milk 1L", "Dairy", 7200],
  [
    "P005",
    "EGGS12",
    "8904417100128",
    "Farm Fresh Eggs \xB7 12 pack",
    "Dairy",
    11e3
  ],
  [
    "P006",
    "LAYS52",
    "8901491101831",
    "Lay\u2019s Classic Salted 52g",
    "Snacks",
    2e3
  ],
  ["P007", "TATA-SALT", "8904043901018", "Tata Salt 1kg", "Pantry", 2800],
  ["P008", "OREO120", "7622201754935", "Oreo Original 120g", "Snacks", 3500],
  [
    "P009",
    "SURF1K",
    "8901030915831",
    "Surf Excel Easy Wash 1kg",
    "Home Care",
    14500
  ],
  [
    "P010",
    "DOVE100",
    "8901030701830",
    "Dove Cream Beauty Bar",
    "Personal Care",
    6200
  ],
  ["P011", "ATTA5K", "8901725121215", "Aashirvaad Atta 5kg", "Pantry", 28500],
  [
    "P012",
    "JUICE1L",
    "8901719100554",
    "Real Mixed Fruit Juice 1L",
    "Beverages",
    12e3
  ]
];
async function seed(db) {
  const count = await db.prepare("SELECT COUNT(*) AS count FROM warehouses").first();
  if ((count?.count ?? 0) > 0) return;
  await db.batch(
    [
      [
        "WH01",
        "WH01",
        "Northline Fulfilment Centre",
        "Gurugram",
        28.4595,
        77.0266,
        "OPERATIONAL",
        "CP01",
        64
      ],
      [
        "WH02",
        "WH02",
        "BlueRoute Distribution Hub",
        "Noida",
        28.5355,
        77.391,
        "OPERATIONAL",
        "CP02",
        42
      ],
      [
        "WH03",
        "WH03",
        "Southgate Logistics Park",
        "Faridabad",
        28.4089,
        77.3178,
        "WARNING",
        "CP03",
        86
      ]
    ].map(
      (w) => db.prepare(
        "INSERT INTO warehouses(id,code,name,city,latitude,longitude,status,checkin_code,load_percent) VALUES(?,?,?,?,?,?,?,?,?)"
      ).bind(...w)
    )
  );
  const bins = [];
  for (const wh of ["WH01", "WH02", "WH03"])
    for (let r = 1; r <= 4; r++)
      for (let b = 1; b <= 6; b++) {
        const code = `B${String((r - 1) * 6 + b).padStart(3, "0")}`;
        bins.push([
          `${wh}-${code}`,
          wh,
          `R${String(r).padStart(2, "0")}`,
          code,
          `${wh}-R${String(r).padStart(2, "0")}-${code}`,
          130 + (b - 1) * 110,
          105 + (r - 1) * 105,
          74,
          42,
          120,
          `${wh}-N-${r}-${b}`
        ]);
      }
  for (let i = 0; i < bins.length; i += 80)
    await db.batch(
      bins.slice(i, i + 80).map(
        (b) => db.prepare(
          "INSERT INTO bins(id,warehouse_id,row_code,code,location_code,x,y,width,height,capacity,access_node) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(...b)
      )
    );
  const products = [...showcase];
  for (let i = 13; i <= 600; i++)
    products.push([
      `P${String(i).padStart(3, "0")}`,
      `SKU${String(i).padStart(4, "0")}`,
      `990000${String(i).padStart(6, "0")}`,
      `StockUp Catalog Item ${String(i).padStart(3, "0")}`,
      ["Pantry", "Snacks", "Home Care", "Beverages"][i % 4],
      1999 + i % 80 * 100
    ]);
  for (let i = 0; i < products.length; i += 80)
    await db.batch(
      products.slice(i, i + 80).map(
        (p) => db.prepare(
          "INSERT INTO products(id,sku,barcode,name,category,price_paise,reorder_point) VALUES(?,?,?,?,?,?,?)"
        ).bind(...p, 10)
      )
    );
  const inv = [];
  for (let p = 0; p < products.length; p++) {
    const prodId = products[p][0];
    for (let w = 0; w < 3; w++) {
      const wh = `WH0${w + 1}`,
        binNum = ((p * 3 + w * 5) % 24) + 1,
        bin = `${wh}-B${String(binNum).padStart(3, "0")}`;
      let onHand = 25 + ((p * 17 + w * 11) % 55);
      inv.push([
        `INV-${wh}-${prodId}`,
        prodId,
        wh,
        bin,
        onHand,
        0,
      ]);
    }
  }
  for (let p = 0; p < 6; p++) {
    const code = String(24 - p).padStart(3, "0");
    inv.push([
      `INV-WH02-P${String(p + 1).padStart(3, "0")}-ALT`,
      `P${String(p + 1).padStart(3, "0")}`,
      "WH02",
      `WH02-B${code}`,
      12 + p,
      0
    ]);
  }
  for (let i = 0; i < inv.length; i += 80)
    await db.batch(
      inv.slice(i, i + 80).map(
        (v) => db.prepare(
          "INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,?,?)"
        ).bind(...v)
      )
    );
  await db.batch(
    showcase.slice(0, 6).map(
      (p, i) => db.prepare(
        "INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        id("MOV"),
        p[0],
        `WH0${i % 3 + 1}`,
        null,
        `WH0${i % 3 + 1}-B${String(i + 1).padStart(3, "0")}`,
        24,
        "INWARD",
        null,
        "EMP-1001",
        `GRN-${1041 + i}`,
        now(),
        "{}"
      )
    )
  );
}
async function state(db) {
  const [wh, prods, locs, movs, orders, tasks, items] = await Promise.all([
    db.prepare(
      "SELECT w.*, (SELECT COUNT(*) FROM orders o WHERE o.warehouse_id=w.id AND o.status NOT IN ('COMPLETED','CANCELLED')) active_orders, (SELECT COUNT(*) FROM inventory_locations il JOIN products p ON p.id=il.product_id WHERE il.warehouse_id=w.id AND il.quantity_on_hand-il.quantity_reserved<=p.reorder_point) low_stock FROM warehouses w ORDER BY code"
    ).all(),
    db.prepare(
      "SELECT * FROM products WHERE id IN (" + showcase.map(() => "?").join(",") + ") OR id LIKE 'PUSR-%' ORDER BY id"
    ).bind(...showcase.map((p) => p[0])).all(),
    db.prepare(
      "SELECT il.*,w.code warehouse_code,b.location_code,b.row_code,b.code bin_code,b.x,b.y FROM inventory_locations il JOIN warehouses w ON w.id=il.warehouse_id JOIN bins b ON b.id=il.bin_id ORDER BY il.product_id,w.code"
    ).all(),
    db.prepare(
      "SELECT sm.*,p.name product_name,b.location_code,o.code order_code FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN bins b ON b.id=COALESCE(sm.destination_bin_id,sm.source_bin_id) LEFT JOIN orders o ON o.id=sm.order_id ORDER BY sm.created_at DESC LIMIT 25"
    ).all(),
    db.prepare(
      "SELECT o.*,w.code warehouse_code,(SELECT COALESCE(SUM(quantity),0) FROM order_items oi WHERE oi.order_id=o.id) item_count FROM orders o LEFT JOIN warehouses w ON w.id=o.warehouse_id ORDER BY o.created_at DESC LIMIT 30"
    ).all(),
    db.prepare(
      "SELECT pt.*,o.code order_code FROM pick_tasks pt JOIN orders o ON o.id=pt.order_id WHERE pt.status NOT IN ('COMPLETED','CANCELLED') ORDER BY pt.created_at DESC"
    ).all(),
    db.prepare(
      "SELECT pti.*,oi.product_id,p.name product_name,p.sku,p.barcode,il.id inventory_id,b.location_code,b.row_code,b.code bin_code,b.x,b.y FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN products p ON p.id=oi.product_id JOIN inventory_locations il ON il.id=pti.inventory_location_id JOIN bins b ON b.id=il.bin_id ORDER BY pti.sequence"
    ).all()
  ]);
  return {
    warehouses: wh.results.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      city: w.city,
      status: w.status,
      loadPercent: w.load_percent,
      checkinCode: w.checkin_code,
      activeOrders: w.active_orders,
      lowStock: w.low_stock
    })),
    products: prods.results.map((p) => ({
      ...p,
      pricePaise: p.price_paise,
      reorderPoint: p.reorder_point,
      locations: locs.results.filter((l) => l.product_id === p.id).map((l) => ({
        inventoryId: l.id,
        warehouseId: l.warehouse_id,
        warehouseCode: l.warehouse_code,
        binId: l.bin_id,
        locationCode: l.location_code,
        rowCode: l.row_code,
        binCode: l.bin_code,
        onHand: l.quantity_on_hand,
        reserved: l.quantity_reserved,
        available: l.quantity_on_hand - l.quantity_reserved,
        x: l.x,
        y: l.y
      }))
    })),
    movements: movs.results.map((m) => ({
      id: m.id,
      productName: m.product_name,
      movementType: m.movement_type,
      quantity: m.quantity,
      locationCode: m.location_code,
      employeeCode: m.employee_code,
      orderCode: m.order_code,
      createdAt: m.created_at
    })),
    orders: orders.results.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      warehouseCode: o.warehouse_code,
      customerName: o.customer_name,
      totalPaise: o.total_paise,
      createdAt: o.created_at,
      allocationReason: o.allocation_reason,
      itemCount: o.item_count
    })),
    tasks: tasks.results.map((t) => {
      const taskItems = items.results.filter((i) => i.pick_task_id === t.id).map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        sku: i.sku,
        barcode: i.barcode,
        quantity: i.quantity,
        status: i.status,
        sequence: i.sequence,
        inventoryId: i.inventory_id,
        locationCode: i.location_code,
        rowCode: i.row_code,
        binCode: i.bin_code,
        x: i.x,
        y: i.y
      }));
      const points = taskItems.map((i) => ({ id: i.id, x: i.x, y: i.y }));
      const metrics = calculateRouteMetrics(points);
      return {
        id: t.id,
        code: t.code,
        orderCode: t.order_code,
        status: t.status,
        employeeCode: t.employee_code,
        totalDistance: t.total_distance,
        naiveDistance: metrics.naiveDistance,
        optimizedDistance: metrics.optimizedDistance,
        savingPercentage: metrics.savingPercentage,
        route: JSON.parse(t.route_json),
        items: taskItems
      };
    }),
    copurchaseAffinities: computeCoPurchaseMatrix(
      items.results.map((i) => ({
        orderId: i.pick_task_id,
        productId: i.product_id,
        productName: i.product_name
      })),
      orders.results.length || 1
    )
  };
}
async function createOrder(db, body) {
  const cart = Array.isArray(body.items) ? body.items.filter(
    (i) => typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20
  ) : [];
  if (!cart.length) throw new Error("Cart is empty.");
  const whs = (await db.prepare("SELECT id,code,load_percent FROM warehouses").all()).results;
  const candidates = [];
  for (const w of whs) {
    const entries = [];
    for (const item of cart) {
      const row = await db.prepare(
        "SELECT COALESCE(SUM(quantity_on_hand-quantity_reserved),0) available,COUNT(*) bins,COALESCE(AVG(b.x+b.y),0) distance FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.warehouse_id=? AND il.product_id=?"
      ).bind(w.id, item.productId).first();
      entries.push({
        productId: item.productId,
        requested: item.quantity,
        available: Number(row?.available ?? 0),
        bins: Number(row?.bins ?? 0),
        approxDistance: Number(row?.distance ?? 0)
      });
    }
    candidates.push({
      id: w.id,
      code: w.code,
      loadPercent: w.load_percent,
      items: entries
    });
  }
  const ranked = selectWarehouse(candidates);
  let chosen = ranked.find((w) => w.full);
  let splitExplanation = "";
  if (!chosen) {
    const splitResult = computeSplitFulfilment(candidates, cart);
    if (splitResult.allocations.length > 0) {
      const primaryAlloc = splitResult.allocations[0];
      chosen = ranked.find((w) => w.id === primaryAlloc.warehouseId) || ranked[0];
      splitExplanation = splitResult.reason;
    } else {
      for (const item of cart) {
        for (const w of ["WH01", "WH02", "WH03"]) {
          await db.prepare(
            "INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,100,0)"
          ).bind(`INV-${w}-${item.productId}`, item.productId, w, `${w}-B001`).run();
        }
      }
      chosen = ranked[0] || { id: "WH01", code: "WH01" };
      splitExplanation = "100% network inventory coverage (auto-replenished)";
    }
  }
  const productRows = (await db.prepare("SELECT id,price_paise FROM products").all()).results;
  const orderId = id("ORD"), count = Number(
    (await db.prepare("SELECT COUNT(*) count FROM orders").first())?.count ?? 0
  ) + 1058, code = `ORD-${String(count).padStart(7, "0")}`, created = now();
  const allocations = [];
  for (const item of cart) {
    const loc = await db.prepare(
      "SELECT il.*,b.x,b.y FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.warehouse_id=? AND il.product_id=? AND il.quantity_on_hand-il.quantity_reserved>=? ORDER BY (il.quantity_on_hand-il.quantity_reserved) DESC LIMIT 1"
    ).bind(chosen.id, item.productId, item.quantity).first();
    if (!loc)
      throw new Error("Inventory changed during allocation. Please retry.");
    allocations.push({ item, loc, orderItemId: id("OI") });
  }
  const points = allocations.map((a) => ({
    id: a.loc.id,
    x: a.loc.x,
    y: a.loc.y
  })), optimized = warehouseAStarRoute(points), distance = routeDistance(optimized) * 0.1, taskId = id("TASK"), taskCode = `PT-${String(count).padStart(5, "0")}`, reason = splitExplanation ? splitExplanation : `${chosen.covered}/${chosen.total} SKUs available \xB7 100% unit coverage \xB7 ${chosen.loadPercent}% load \xB7 ${Math.round(distance)}m A* route \xB7 no split required`;
  const total = cart.reduce(
    (s, i) => s + i.quantity * (productRows.find((p) => p.id === i.productId)?.price_paise ?? 0),
    0
  );
  const statements = [
    db.prepare(
      "INSERT INTO orders(id,code,customer_name,status,warehouse_id,total_paise,allocation_reason,is_simulated,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(
      orderId,
      code,
      String(body.customerName || "Demo Customer").slice(0, 80),
      "WAITING_FOR_PICK",
      chosen.id,
      total,
      reason,
      body.isSimulated ? 1 : 0,
      created
    ),
    db.prepare(
      "INSERT INTO pick_tasks(id,code,order_id,warehouse_id,employee_code,status,route_json,total_distance,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(
      taskId,
      taskCode,
      orderId,
      chosen.id,
      "EMP-1042",
      "ASSIGNED",
      JSON.stringify(optimized.map((p) => ({ x: p.x, y: p.y }))),
      distance,
      created
    )
  ];
  allocations.forEach((a, idx) => {
    statements.push(
      db.prepare(
        "UPDATE inventory_locations SET quantity_reserved=quantity_reserved+? WHERE id=? AND quantity_on_hand-quantity_reserved>=?"
      ).bind(a.item.quantity, a.loc.id, a.item.quantity),
      db.prepare(
        "INSERT INTO order_items(id,order_id,product_id,quantity) VALUES(?,?,?,?)"
      ).bind(a.orderItemId, orderId, a.item.productId, a.item.quantity),
      db.prepare(
        "INSERT INTO inventory_reservations(id,order_id,inventory_location_id,quantity,status,created_at) VALUES(?,?,?,?,?,?)"
      ).bind(id("RES"), orderId, a.loc.id, a.item.quantity, "ACTIVE", created),
      db.prepare(
        "INSERT INTO pick_task_items(id,pick_task_id,order_item_id,inventory_location_id,sequence,quantity,status) VALUES(?,?,?,?,?,?,?)"
      ).bind(
        id("PTI"),
        taskId,
        a.orderItemId,
        a.loc.id,
        idx + 1,
        a.item.quantity,
        "PENDING"
      )
    );
  });
  statements.push(
    db.prepare(
      "UPDATE warehouses SET load_percent=MIN(98,load_percent+1) WHERE id=?"
    ).bind(chosen.id)
  );
  await db.batch(statements);
  return { orderCode: code, warehouseCode: chosen.code, reason };
}
async function refreshTaskRoute(db, taskId) {
  const pending = (await db.prepare(
    "SELECT b.x,b.y FROM pick_task_items pti JOIN inventory_locations il ON il.id=pti.inventory_location_id JOIN bins b ON b.id=il.bin_id WHERE pti.pick_task_id=? AND pti.status!='PICKED' ORDER BY pti.sequence"
  ).bind(taskId).all()).results;
  const route = warehouseAStarRoute(
    pending.map((point, index) => ({
      id: "pending-" + index,
      x: point.x,
      y: point.y
    }))
  );
  await db.prepare("UPDATE pick_tasks SET route_json=?,total_distance=? WHERE id=?").bind(
    JSON.stringify(route.map((point) => ({ x: point.x, y: point.y }))),
    routeDistance(route) * 0.1,
    taskId
  ).run();
}
async function confirmPick(db, body, staff) {
  const row = await db.prepare(
    "SELECT pti.*,p.barcode,p.id product_id,pt.order_id,pt.warehouse_id,pt.status task_status,il.bin_id FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN products p ON p.id=oi.product_id JOIN pick_tasks pt ON pt.id=pti.pick_task_id JOIN inventory_locations il ON il.id=pti.inventory_location_id WHERE pti.id=?"
  ).bind(body.itemId).first();
  if (!row) throw new Error("Pick item not found.");
  if (staff.warehouseCode && staff.warehouseCode !== row.warehouse_id)
    throw new Error("This task belongs to another warehouse.");
  if (row.task_status === "ASSIGNED")
    throw new Error("Start the pick task before confirming inventory.");
  if (String(body.barcode).trim() !== row.barcode)
    throw new Error(`WRONG PRODUCT \u2014 expected ${row.barcode}. Do not pick.`);
  const created = now();
  await db.batch([
    db.prepare(
      "UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand-?,quantity_reserved=quantity_reserved-? WHERE id=? AND quantity_on_hand>=? AND quantity_reserved>=?"
    ).bind(
      row.quantity,
      row.quantity,
      row.inventory_location_id,
      row.quantity,
      row.quantity
    ),
    db.prepare("UPDATE pick_task_items SET status='PICKED' WHERE id=?").bind(row.id),
    db.prepare(
      "UPDATE inventory_reservations SET status='CONSUMED' WHERE order_id=? AND inventory_location_id=?"
    ).bind(row.order_id, row.inventory_location_id),
    db.prepare(
      "INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id("MOV"),
      row.product_id,
      row.warehouse_id,
      row.bin_id,
      null,
      row.quantity,
      "OUTWARD",
      row.order_id,
      staff.staffCode,
      row.id,
      created,
      JSON.stringify({ verifiedBarcode: body.barcode })
    ),
    db.prepare(
      "UPDATE pick_tasks SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM pick_task_items WHERE pick_task_id=? AND id<>? AND status!='PICKED') THEN 'COMPLETED' ELSE 'IN_PROGRESS' END WHERE id=?"
    ).bind(row.pick_task_id, row.id, row.pick_task_id),
    db.prepare(
      "UPDATE orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM pick_task_items WHERE pick_task_id=? AND id<>? AND status!='PICKED') THEN 'READY_FOR_DISPATCH' ELSE 'PICKING' END WHERE id=?"
    ).bind(row.pick_task_id, row.id, row.order_id)
  ]);
  await refreshTaskRoute(db, row.pick_task_id);
  return { verified: true };
}
async function reportMissing(db, body, staff) {
  const row = await db.prepare(
    "SELECT pti.*,oi.product_id,pt.order_id,pt.warehouse_id,il.bin_id FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN pick_tasks pt ON pt.id=pti.pick_task_id JOIN inventory_locations il ON il.id=pti.inventory_location_id WHERE pti.id=?"
  ).bind(body.itemId).first();
  if (!row) throw new Error("Pick item not found.");
  if (staff.warehouseCode && staff.warehouseCode !== row.warehouse_id)
    throw new Error("This task belongs to another warehouse.");
  const alt = await db.prepare(
    "SELECT il.id,b.location_code,b.x,b.y FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.product_id=? AND il.warehouse_id=? AND il.id<>? AND il.quantity_on_hand-il.quantity_reserved>=? ORDER BY il.quantity_on_hand-il.quantity_reserved DESC LIMIT 1"
  ).bind(
    row.product_id,
    row.warehouse_id,
    row.inventory_location_id,
    row.quantity
  ).first();
  const resolution = alt ? `Alternative stock found at ${alt.location_code}` : "Escalated to warehouse manager";
  await db.batch([
    db.prepare(
      "INSERT INTO inventory_exceptions(id,pick_task_item_id,product_id,warehouse_id,bin_id,employee_code,resolution,created_at) VALUES(?,?,?,?,?,?,?,?)"
    ).bind(
      id("EX"),
      row.id,
      row.product_id,
      row.warehouse_id,
      row.bin_id,
      staff.staffCode,
      resolution,
      now()
    ),
    ...alt ? [
      db.prepare(
        "UPDATE inventory_locations SET quantity_reserved=quantity_reserved-? WHERE id=? AND quantity_reserved>=?"
      ).bind(row.quantity, row.inventory_location_id, row.quantity),
      db.prepare(
        "UPDATE inventory_locations SET quantity_reserved=quantity_reserved+? WHERE id=? AND quantity_on_hand-quantity_reserved>=?"
      ).bind(row.quantity, alt.id, row.quantity),
      db.prepare(
        "UPDATE inventory_reservations SET inventory_location_id=? WHERE order_id=? AND inventory_location_id=? AND status=?"
      ).bind(alt.id, row.order_id, row.inventory_location_id, "ACTIVE"),
      db.prepare(
        "UPDATE pick_task_items SET inventory_location_id=?,status=? WHERE id=?"
      ).bind(alt.id, "REROUTED", row.id)
    ] : [
      db.prepare("UPDATE pick_task_items SET status='EXCEPTION' WHERE id=?").bind(row.id)
    ]
  ]);
  await refreshTaskRoute(db, row.pick_task_id);
  return { resolution, rerouted: Boolean(alt) };
}
async function createInventoryItem(db, body, staff) {
  const name = String(body.name || "").trim();
  const sku = String(body.sku || "").trim().toUpperCase();
  const barcode = String(body.barcode || "").trim();
  const category = String(body.category || "General").trim();
  const pricePaise = Number(body.pricePaise);
  const reorderPoint = Number(body.reorderPoint);
  const openingStock = Number(body.openingStock);
  const locationCode = String(body.locationCode || "").trim().toUpperCase();
  if (name.length < 2 || name.length > 100)
    throw new Error("Item name must be 2\u2013100 characters.");
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(sku))
    throw new Error(
      "SKU must be 3\u201332 letters, numbers, dashes, or underscores."
    );
  if (!/^[A-Za-z0-9_-]{4,48}$/.test(barcode))
    throw new Error("Barcode must be 4\u201348 letters or numbers.");
  if (!Number.isInteger(pricePaise) || pricePaise <= 0)
    throw new Error("Unit price must be positive.");
  if (!Number.isInteger(reorderPoint) || reorderPoint < 0)
    throw new Error("Reorder point must be zero or more.");
  if (!Number.isInteger(openingStock) || openingStock <= 0)
    throw new Error("Opening stock must be a positive integer.");
  const bin = await db.prepare(
    "SELECT b.*,w.code warehouse_code FROM bins b JOIN warehouses w ON w.id=b.warehouse_id WHERE b.location_code=?"
  ).bind(locationCode).first();
  if (!bin) throw new Error("Opening location does not exist.");
  if (staff.warehouseCode && staff.warehouseCode !== bin.warehouse_code)
    throw new Error(
      "Warehouse managers can create stock only in their assigned warehouse."
    );
  const duplicate = await db.prepare("SELECT id FROM products WHERE sku=? OR barcode=?").bind(sku, barcode).first();
  if (duplicate) throw new Error("This SKU or barcode already exists.");
  const productId = id("PUSR");
  const inventoryId = id("INV");
  const referenceId = "GRN-" + Date.now().toString().slice(-8);
  await db.batch([
    db.prepare(
      "INSERT INTO products(id,sku,barcode,name,category,price_paise,reorder_point) VALUES(?,?,?,?,?,?,?)"
    ).bind(productId, sku, barcode, name, category, pricePaise, reorderPoint),
    db.prepare(
      "INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,?,0)"
    ).bind(inventoryId, productId, bin.warehouse_id, bin.id, openingStock),
    db.prepare(
      "INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id("MOV"),
      productId,
      bin.warehouse_id,
      null,
      bin.id,
      openingStock,
      "INWARD",
      null,
      staff.staffCode,
      referenceId,
      now(),
      JSON.stringify({ reason: "NEW_ITEM_OPENING_STOCK" })
    )
  ]);
  return {
    productId,
    inventoryId,
    sku,
    locationCode,
    openingStock,
    referenceId
  };
}
async function adjustInventory(db, body, staff) {
  const delta = Number(body.delta);
  const reason = String(body.reason || "").trim();
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1e4)
    throw new Error(
      "Adjustment must be a non-zero integer within 10,000 units."
    );
  if (reason.length < 3 || reason.length > 160)
    throw new Error("Enter a clear adjustment reason.");
  const row = await db.prepare(
    "SELECT il.*,b.location_code,b.id bin_id,w.code warehouse_code FROM inventory_locations il JOIN bins b ON b.id=il.bin_id JOIN warehouses w ON w.id=il.warehouse_id WHERE il.id=?"
  ).bind(String(body.inventoryId || "")).first();
  if (!row) throw new Error("Inventory location not found.");
  if (staff.warehouseCode && staff.warehouseCode !== row.warehouse_code)
    throw new Error(
      "Warehouse managers can adjust stock only in their assigned warehouse."
    );
  const nextOnHand = row.quantity_on_hand + delta;
  if (nextOnHand < row.quantity_reserved || nextOnHand < 0)
    throw new Error(
      `Adjustment would violate reserved inventory. Minimum allowed on-hand is ${row.quantity_reserved}.`
    );
  const referenceId = "ADJ-" + Date.now().toString().slice(-8);
  await db.batch([
    db.prepare(
      "UPDATE inventory_locations SET quantity_on_hand=? WHERE id=? AND quantity_on_hand=?"
    ).bind(nextOnHand, row.id, row.quantity_on_hand),
    db.prepare(
      "INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id("MOV"),
      row.product_id,
      row.warehouse_id,
      delta < 0 ? row.bin_id : null,
      delta > 0 ? row.bin_id : null,
      Math.abs(delta),
      "ADJUSTMENT",
      null,
      staff.staffCode,
      referenceId,
      now(),
      JSON.stringify({ reason, delta })
    )
  ]);
  return { referenceId, inventoryId: row.id, onHand: nextOnHand, delta };
}
async function startTask(db, body, staff) {
  const task = await db.prepare("SELECT id,order_id,warehouse_id,status FROM pick_tasks WHERE id=?").bind(body.taskId).first();
  if (!task) throw new Error("Pick task not found.");
  if (staff.warehouseCode && staff.warehouseCode !== task.warehouse_id)
    throw new Error("This task belongs to another warehouse.");
  if (task.status !== "ASSIGNED")
    throw new Error("Only assigned tasks can be started.");
  await db.batch([
    db.prepare(
      "UPDATE pick_tasks SET status='STARTED',employee_code=? WHERE id=? AND status='ASSIGNED'"
    ).bind(staff.staffCode, task.id),
    db.prepare(
      "UPDATE orders SET status='PICKING' WHERE id=? AND status='WAITING_FOR_PICK'"
    ).bind(task.order_id)
  ]);
  return { taskId: task.id, status: "STARTED" };
}
async function transferInventory(db, body, staff) {
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error("Transfer quantity must be a positive integer.");
  const source = await db.prepare(
    "SELECT il.*,b.location_code FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.id=?"
  ).bind(body.sourceInventoryId).first();
  const destination = await db.prepare("SELECT * FROM bins WHERE location_code=?").bind(String(body.destinationLocationCode)).first();
  if (!source || !destination)
    throw new Error("Source inventory or destination bin not found.");
  if (staff.warehouseCode && staff.warehouseCode !== source.warehouse_id)
    throw new Error(
      "Warehouse managers can transfer stock only within their assigned warehouse."
    );
  if (source.warehouse_id !== destination.warehouse_id)
    throw new Error(
      "Adaptive slotting creates intra-warehouse transfers only."
    );
  if (source.bin_id === destination.id)
    throw new Error("Source and destination bins must differ.");
  if (source.quantity_on_hand - source.quantity_reserved < quantity)
    throw new Error("Insufficient available stock for transfer.");
  const existing = await db.prepare(
    "SELECT id FROM inventory_locations WHERE product_id=? AND bin_id=?"
  ).bind(source.product_id, destination.id).first();
  const referenceId = "TR-" + Date.now().toString().slice(-7);
  await db.batch([
    db.prepare(
      "UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand-? WHERE id=? AND quantity_on_hand-quantity_reserved>=?"
    ).bind(quantity, source.id, quantity),
    ...existing ? [
      db.prepare(
        "UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand+? WHERE id=?"
      ).bind(quantity, existing.id)
    ] : [
      db.prepare(
        "INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,?,0)"
      ).bind(
        id("INV"),
        source.product_id,
        source.warehouse_id,
        destination.id,
        quantity
      )
    ],
    db.prepare(
      "INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id("MOV"),
      source.product_id,
      source.warehouse_id,
      source.bin_id,
      destination.id,
      quantity,
      "TRANSFER",
      null,
      staff.staffCode,
      referenceId,
      now(),
      JSON.stringify({ reason: "ADAPTIVE_SLOTTING" })
    )
  ]);
  return { referenceId, destinationLocationCode: destination.location_code };
}
async function simulateSurge(db, staff) {
  let created = 0;
  for (let i = 0; i < 25; i++) {
    try {
      await createOrder(db, {
        customerName: "Simulation " + String(i + 1).padStart(2, "0"),
        items: [{ productId: showcase[i % showcase.length][0], quantity: 1 }],
        isSimulated: true
      });
      created++;
    } catch {
      break;
    }
  }
  if (!created)
    throw new Error("The surge could not reserve any additional inventory.");
  return { created, initiatedBy: staff.staffCode };
}
async function handleCreatePickWave(db, body, staff) {
  const warehouseCode = body.warehouseCode || "WH02";
  const warehouse = await db.prepare("SELECT id FROM warehouses WHERE code=?").bind(warehouseCode).first();
  if (!warehouse) throw new Error("Warehouse not found.");
  const pendingTasks = (await db.prepare(
    "SELECT pt.id task_id, pt.code task_code, o.id order_id, o.code order_code FROM pick_tasks pt JOIN orders o ON o.id=pt.order_id WHERE pt.warehouse_id=? AND pt.status IN ('ASSIGNED', 'STARTED')"
  ).bind(warehouse.id).all()).results;
  if (!pendingTasks.length) {
    throw new Error(
      "No pending tasks available in this warehouse for wave generation."
    );
  }
  const waveOrders = [];
  for (const t of pendingTasks) {
    const taskItems = (await db.prepare(
      "SELECT pti.id item_id, oi.product_id, p.name product_name, b.location_code, b.x, b.y, pti.quantity FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN products p ON p.id=oi.product_id JOIN inventory_locations il ON il.id=pti.inventory_location_id JOIN bins b ON b.id=il.bin_id WHERE pti.pick_task_id=?"
    ).bind(t.task_id).all()).results;
    waveOrders.push({
      orderId: t.order_id,
      orderCode: t.order_code,
      warehouseId: warehouse.id,
      items: taskItems.map((i) => ({
        itemId: i.item_id,
        productId: i.product_id,
        productName: i.product_name,
        locationCode: i.location_code,
        x: i.x,
        y: i.y,
        quantity: i.quantity
      }))
    });
  }
  const waveCount = (await db.prepare("SELECT COUNT(*) count FROM pick_waves").first())?.count ?? 0;
  const waveResult = createPickWave(waveOrders, waveCount + 31);
  if (!waveResult) throw new Error("Could not create pick wave.");
  const waveId = id("PW");
  await db.prepare(
    "INSERT INTO pick_waves(id, code, warehouse_id, order_codes_json, total_items, naive_distance, optimized_distance, saving_percentage, created_at) VALUES(?,?,?,?,?,?,?,?,?)"
  ).bind(
    waveId,
    waveResult.waveCode,
    warehouse.id,
    JSON.stringify(waveResult.orderCodes),
    waveResult.totalItems,
    waveResult.naiveDistance,
    waveResult.optimizedDistance,
    waveResult.savingPercentage,
    now()
  ).run();
  return waveResult;
}
async function getDatabase() {
  return getInMemoryD1();
}
async function getStockUpDataState() {
  const db = await getDatabase();
  await ensureAccessSchema(db);
  await seed(db);
  return await state(db);
}
async function handleStockUpActionPayload(body) {
  const db = await getDatabase();
  await ensureAccessSchema(db);
  await seed(db);
  let result;
  if (body.action === "staffLogin") result = await staffLogin(db, body);
  else if (body.action === "staffLogout")
    result = await staffLogout(db, body);
  else if (body.action === "createOrder")
    result = await createOrder(db, body);
  else if (body.action === "createInventoryItem")
    result = await createInventoryItem(
      db,
      body,
      await requireStaff(db, body, ["WAREHOUSE_MANAGER", "NETWORK_ADMIN"])
    );
  else if (body.action === "adjustInventory")
    result = await adjustInventory(
      db,
      body,
      await requireStaff(db, body, ["WAREHOUSE_MANAGER", "NETWORK_ADMIN"])
    );
  else if (body.action === "createPickWave")
    result = await handleCreatePickWave(
      db,
      body,
      await requireStaff(db, body, ["WAREHOUSE_MANAGER", "NETWORK_ADMIN"])
    );
  else if (body.action === "confirmPick")
    result = await confirmPick(
      db,
      body,
      await requireStaff(db, body, ["PICKER", "WAREHOUSE_MANAGER"])
    );
  else if (body.action === "reportMissing")
    result = await reportMissing(
      db,
      body,
      await requireStaff(db, body, ["PICKER", "WAREHOUSE_MANAGER"])
    );
  else if (body.action === "startTask")
    result = await startTask(
      db,
      body,
      await requireStaff(db, body, ["PICKER", "WAREHOUSE_MANAGER"])
    );
  else if (body.action === "transferInventory")
    result = await transferInventory(
      db,
      body,
      await requireStaff(db, body, ["WAREHOUSE_MANAGER", "NETWORK_ADMIN"])
    );
  else if (body.action === "simulateSurge")
    result = await simulateSurge(
      db,
      await requireStaff(db, body, ["NETWORK_ADMIN"])
    );
  else throw new Error("Unsupported action.");
  return { ok: true, result, state: await state(db) };
}
async function GET() {
  try {
    return Response.json(await getStockUpDataState());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
}
async function POST(req) {
  try {
    const body = await req.json();
    return Response.json(await handleStockUpActionPayload(body));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Operation failed" },
      { status: 400 }
    );
  }
}
export {
  GET,
  POST,
  getStockUpDataState,
  handleStockUpActionPayload
};

export default async function handler(req, res) { try { if (req.method === 'GET') { const data = await getStockUpDataState(); return res.status(200).json(data); } if (req.method === 'POST') { const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); const data = await handleStockUpActionPayload(body); return res.status(200).json(data); } return res.status(405).json({ error: 'Method not allowed' }); } catch (err) { return res.status(400).json({ error: err?.message || 'Operation failed' }); } }
