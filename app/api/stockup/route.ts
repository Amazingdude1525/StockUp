import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { selectWarehouse } from '@/lib/algorithms/allocation';
import {
  warehouseAStarRoute,
  routeDistance,
  type Point,
} from '@/lib/algorithms/routing';

type D1 = D1Database;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
type SeedProduct = [string, string, string, string, string, number];
const showcase: SeedProduct[] = [
  ['P001', 'COKE750', '8901764020012', 'Coca-Cola 750 ml', 'Beverages', 4500],
  ['P002', 'MAGGI560', '8901058851234', 'Maggi Masala Noodles', 'Pantry', 7800],
  [
    'P003',
    'BREAD400',
    '8906001123456',
    'Harvest Gold Bread 400g',
    'Bakery',
    5000,
  ],
  ['P004', 'MILK1L', '8902080124319', 'Amul Taaza Milk 1L', 'Dairy', 7200],
  [
    'P005',
    'EGGS12',
    '8904417100128',
    'Farm Fresh Eggs · 12 pack',
    'Dairy',
    11000,
  ],
  [
    'P006',
    'LAYS52',
    '8901491101831',
    'Lay’s Classic Salted 52g',
    'Snacks',
    2000,
  ],
  ['P007', 'TATA-SALT', '8904043901018', 'Tata Salt 1kg', 'Pantry', 2800],
  ['P008', 'OREO120', '7622201754935', 'Oreo Original 120g', 'Snacks', 3500],
  [
    'P009',
    'SURF1K',
    '8901030915831',
    'Surf Excel Easy Wash 1kg',
    'Home Care',
    14500,
  ],
  [
    'P010',
    'DOVE100',
    '8901030701830',
    'Dove Cream Beauty Bar',
    'Personal Care',
    6200,
  ],
  ['P011', 'ATTA5K', '8901725121215', 'Aashirvaad Atta 5kg', 'Pantry', 28500],
  [
    'P012',
    'JUICE1L',
    '8901719100554',
    'Real Mixed Fruit Juice 1L',
    'Beverages',
    12000,
  ],
];

async function seed(db: D1) {
  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM warehouses')
    .first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;
  await db.batch(
    [
      [
        'WH01',
        'WH01',
        'Northline Fulfilment Centre',
        'Gurugram',
        28.4595,
        77.0266,
        'OPERATIONAL',
        'CP01',
        64,
      ],
      [
        'WH02',
        'WH02',
        'BlueRoute Distribution Hub',
        'Noida',
        28.5355,
        77.391,
        'OPERATIONAL',
        'CP02',
        42,
      ],
      [
        'WH03',
        'WH03',
        'Southgate Logistics Park',
        'Faridabad',
        28.4089,
        77.3178,
        'WARNING',
        'CP03',
        86,
      ],
    ].map((w) =>
      db
        .prepare(
          'INSERT INTO warehouses(id,code,name,city,latitude,longitude,status,checkin_code,load_percent) VALUES(?,?,?,?,?,?,?,?,?)',
        )
        .bind(...w),
    ),
  );
  const bins: Array<
    [
      string,
      string,
      string,
      string,
      string,
      number,
      number,
      number,
      number,
      number,
      string,
    ]
  > = [];
  for (const wh of ['WH01', 'WH02', 'WH03'])
    for (let r = 1; r <= 4; r++)
      for (let b = 1; b <= 6; b++) {
        const code = `B${String((r - 1) * 6 + b).padStart(3, '0')}`;
        bins.push([
          `${wh}-${code}`,
          wh,
          `R${String(r).padStart(2, '0')}`,
          code,
          `${wh}-R${String(r).padStart(2, '0')}-${code}`,
          130 + (b - 1) * 110,
          105 + (r - 1) * 105,
          74,
          42,
          120,
          `${wh}-N-${r}-${b}`,
        ]);
      }
  for (let i = 0; i < bins.length; i += 80)
    await db.batch(
      bins
        .slice(i, i + 80)
        .map((b) =>
          db
            .prepare(
              'INSERT INTO bins(id,warehouse_id,row_code,code,location_code,x,y,width,height,capacity,access_node) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(...b),
        ),
    );
  const products = [...showcase];
  for (let i = 13; i <= 600; i++)
    products.push([
      `P${String(i).padStart(3, '0')}`,
      `SKU${String(i).padStart(4, '0')}`,
      `990000${String(i).padStart(6, '0')}`,
      `StockUp Catalog Item ${String(i).padStart(3, '0')}`,
      ['Pantry', 'Snacks', 'Home Care', 'Beverages'][i % 4],
      1999 + (i % 80) * 100,
    ]);
  for (let i = 0; i < products.length; i += 80)
    await db.batch(
      products
        .slice(i, i + 80)
        .map((p) =>
          db
            .prepare(
              'INSERT INTO products(id,sku,barcode,name,category,price_paise,reorder_point) VALUES(?,?,?,?,?,?,?)',
            )
            .bind(...p, 10),
        ),
    );
  const inv = [] as Array<[string, string, string, string, number, number]>;
  for (let p = 0; p < showcase.length; p++)
    for (let w = 0; w < 3; w++) {
      const wh = `WH0${w + 1}`,
        binNum = ((p * 3 + w * 5) % 24) + 1,
        bin = `${wh}-B${String(binNum).padStart(3, '0')}`;
      let onHand = 18 + ((p * 17 + w * 11) % 54);
      if ((p + w) % 7 === 0) onHand = 7;
      inv.push([
        `INV-${wh}-P${String(p + 1).padStart(3, '0')}`,
        `P${String(p + 1).padStart(3, '0')}`,
        wh,
        bin,
        onHand,
        (p + w) % 4,
      ]);
    }
  for (let p = 0; p < 6; p++) {
    const code = String(24 - p).padStart(3, '0');
    inv.push([
      `INV-WH02-P${String(p + 1).padStart(3, '0')}-ALT`,
      `P${String(p + 1).padStart(3, '0')}`,
      'WH02',
      `WH02-B${code}`,
      12 + p,
      0,
    ]);
  }
  for (let i = 0; i < inv.length; i += 80)
    await db.batch(
      inv
        .slice(i, i + 80)
        .map((v) =>
          db
            .prepare(
              'INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,?,?)',
            )
            .bind(...v),
        ),
    );
  await db.batch(
    showcase
      .slice(0, 6)
      .map((p, i) =>
        db
          .prepare(
            'INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            id('MOV'),
            p[0],
            `WH0${(i % 3) + 1}`,
            null,
            `WH0${(i % 3) + 1}-B${String(i + 1).padStart(3, '0')}`,
            24,
            'INWARD',
            null,
            'EMP-1001',
            `GRN-${1041 + i}`,
            now(),
            '{}',
          ),
      ),
  );
}

async function state(db: D1) {
  const [wh, prods, locs, movs, orders, tasks, items] = await Promise.all([
    db
      .prepare(
        "SELECT w.*, (SELECT COUNT(*) FROM orders o WHERE o.warehouse_id=w.id AND o.status NOT IN ('COMPLETED','CANCELLED')) active_orders, (SELECT COUNT(*) FROM inventory_locations il JOIN products p ON p.id=il.product_id WHERE il.warehouse_id=w.id AND il.quantity_on_hand-il.quantity_reserved<=p.reorder_point) low_stock FROM warehouses w ORDER BY code",
      )
      .all(),
    db
      .prepare(
        'SELECT * FROM products WHERE id IN (' +
          showcase.map(() => '?').join(',') +
          ') ORDER BY id',
      )
      .bind(...showcase.map((p) => p[0]))
      .all(),
    db
      .prepare(
        'SELECT il.*,w.code warehouse_code,b.location_code,b.row_code,b.code bin_code,b.x,b.y FROM inventory_locations il JOIN warehouses w ON w.id=il.warehouse_id JOIN bins b ON b.id=il.bin_id ORDER BY il.product_id,w.code',
      )
      .all(),
    db
      .prepare(
        'SELECT sm.*,p.name product_name,b.location_code,o.code order_code FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN bins b ON b.id=COALESCE(sm.destination_bin_id,sm.source_bin_id) LEFT JOIN orders o ON o.id=sm.order_id ORDER BY sm.created_at DESC LIMIT 25',
      )
      .all(),
    db
      .prepare(
        'SELECT o.*,w.code warehouse_code,(SELECT COALESCE(SUM(quantity),0) FROM order_items oi WHERE oi.order_id=o.id) item_count FROM orders o LEFT JOIN warehouses w ON w.id=o.warehouse_id ORDER BY o.created_at DESC LIMIT 30',
      )
      .all(),
    db
      .prepare(
        "SELECT pt.*,o.code order_code FROM pick_tasks pt JOIN orders o ON o.id=pt.order_id WHERE pt.status NOT IN ('COMPLETED','CANCELLED') ORDER BY pt.created_at DESC",
      )
      .all(),
    db
      .prepare(
        'SELECT pti.*,oi.product_id,p.name product_name,p.sku,p.barcode,il.id inventory_id,b.location_code,b.row_code,b.code bin_code,b.x,b.y FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN products p ON p.id=oi.product_id JOIN inventory_locations il ON il.id=pti.inventory_location_id JOIN bins b ON b.id=il.bin_id ORDER BY pti.sequence',
      )
      .all(),
  ]);
  return {
    warehouses: wh.results.map((w: any) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      city: w.city,
      status: w.status,
      loadPercent: w.load_percent,
      checkinCode: w.checkin_code,
      activeOrders: w.active_orders,
      lowStock: w.low_stock,
    })),
    products: prods.results.map((p: any) => ({
      ...p,
      pricePaise: p.price_paise,
      locations: locs.results
        .filter((l: any) => l.product_id === p.id)
        .map((l: any) => ({
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
          y: l.y,
        })),
    })),
    movements: movs.results.map((m: any) => ({
      id: m.id,
      productName: m.product_name,
      movementType: m.movement_type,
      quantity: m.quantity,
      locationCode: m.location_code,
      employeeCode: m.employee_code,
      orderCode: m.order_code,
      createdAt: m.created_at,
    })),
    orders: orders.results.map((o: any) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      warehouseCode: o.warehouse_code,
      customerName: o.customer_name,
      totalPaise: o.total_paise,
      createdAt: o.created_at,
      allocationReason: o.allocation_reason,
      itemCount: o.item_count,
    })),
    tasks: tasks.results.map((t: any) => ({
      id: t.id,
      code: t.code,
      orderCode: t.order_code,
      status: t.status,
      employeeCode: t.employee_code,
      totalDistance: t.total_distance,
      route: JSON.parse(t.route_json),
      items: items.results
        .filter((i: any) => i.pick_task_id === t.id)
        .map((i: any) => ({
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
          y: i.y,
        })),
    })),
  };
}

async function createOrder(db: D1, body: any) {
  const cart = Array.isArray(body.items)
    ? body.items.filter(
        (i: any) =>
          typeof i.productId === 'string' &&
          Number.isInteger(i.quantity) &&
          i.quantity > 0 &&
          i.quantity <= 20,
      )
    : [];
  if (!cart.length) throw new Error('Cart is empty.');
  const whs = (
    await db.prepare('SELECT id,code,load_percent FROM warehouses').all()
  ).results as any[];
  const candidates = [] as any[];
  for (const w of whs) {
    const entries = [];
    for (const item of cart) {
      const row = await db
        .prepare(
          'SELECT COALESCE(SUM(quantity_on_hand-quantity_reserved),0) available,COUNT(*) bins,COALESCE(AVG(b.x+b.y),0) distance FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.warehouse_id=? AND il.product_id=?',
        )
        .bind(w.id, item.productId)
        .first<any>();
      entries.push({
        productId: item.productId,
        requested: item.quantity,
        available: Number(row?.available ?? 0),
        bins: Number(row?.bins ?? 0),
        approxDistance: Number(row?.distance ?? 0),
      });
    }
    candidates.push({
      id: w.id,
      code: w.code,
      loadPercent: w.load_percent,
      items: entries,
    });
  }
  const ranked = selectWarehouse(candidates),
    chosen = ranked.find((w) => w.full);
  if (!chosen)
    throw new Error(
      'No single warehouse can fulfil this cart. Split fulfilment recommendation required.',
    );
  const productRows = (
    await db.prepare('SELECT id,price_paise FROM products').all()
  ).results as any[];
  const orderId = id('ORD'),
    count =
      Number(
        (await db.prepare('SELECT COUNT(*) count FROM orders').first<any>())
          ?.count ?? 0,
      ) + 1058,
    code = `ORD-${String(count).padStart(7, '0')}`,
    created = now();
  const allocations = [] as any[];
  for (const item of cart) {
    const loc = await db
      .prepare(
        'SELECT il.*,b.x,b.y FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.warehouse_id=? AND il.product_id=? AND il.quantity_on_hand-il.quantity_reserved>=? ORDER BY (il.quantity_on_hand-il.quantity_reserved) DESC LIMIT 1',
      )
      .bind(chosen.id, item.productId, item.quantity)
      .first<any>();
    if (!loc)
      throw new Error('Inventory changed during allocation. Please retry.');
    allocations.push({ item, loc, orderItemId: id('OI') });
  }
  const points: Point[] = allocations.map((a: any) => ({
      id: a.loc.id,
      x: a.loc.x,
      y: a.loc.y,
    })),
    optimized = warehouseAStarRoute(points),
    distance = routeDistance(optimized) * 0.1,
    taskId = id('TASK'),
    taskCode = `PT-${String(count).padStart(5, '0')}`,
    reason = `${chosen.covered}/${chosen.total} SKUs available · 100% unit coverage · ${chosen.loadPercent}% load · ${Math.round(distance)}m A* route · no split required`;
  const total = cart.reduce(
    (s: any, i: any) =>
      s +
      i.quantity *
        (productRows.find((p) => p.id === i.productId)?.price_paise ?? 0),
    0,
  );
  const statements = [
    db
      .prepare(
        'INSERT INTO orders(id,code,customer_name,status,warehouse_id,total_paise,allocation_reason,is_simulated,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        orderId,
        code,
        String(body.customerName || 'Demo Customer').slice(0, 80),
        'WAITING_FOR_PICK',
        chosen.id,
        total,
        reason,
        body.isSimulated ? 1 : 0,
        created,
      ),
    db
      .prepare(
        'INSERT INTO pick_tasks(id,code,order_id,warehouse_id,employee_code,status,route_json,total_distance,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        taskId,
        taskCode,
        orderId,
        chosen.id,
        'EMP-1042',
        'ASSIGNED',
        JSON.stringify(optimized.map((p) => ({ x: p.x, y: p.y }))),
        distance,
        created,
      ),
  ];
  allocations.forEach((a: any, idx: number) => {
    statements.push(
      db
        .prepare(
          'UPDATE inventory_locations SET quantity_reserved=quantity_reserved+? WHERE id=? AND quantity_on_hand-quantity_reserved>=?',
        )
        .bind(a.item.quantity, a.loc.id, a.item.quantity),
      db
        .prepare(
          'INSERT INTO order_items(id,order_id,product_id,quantity) VALUES(?,?,?,?)',
        )
        .bind(a.orderItemId, orderId, a.item.productId, a.item.quantity),
      db
        .prepare(
          'INSERT INTO inventory_reservations(id,order_id,inventory_location_id,quantity,status,created_at) VALUES(?,?,?,?,?,?)',
        )
        .bind(id('RES'), orderId, a.loc.id, a.item.quantity, 'ACTIVE', created),
      db
        .prepare(
          'INSERT INTO pick_task_items(id,pick_task_id,order_item_id,inventory_location_id,sequence,quantity,status) VALUES(?,?,?,?,?,?,?)',
        )
        .bind(
          id('PTI'),
          taskId,
          a.orderItemId,
          a.loc.id,
          idx + 1,
          a.item.quantity,
          'PENDING',
        ),
    );
  });
  statements.push(
    db
      .prepare(
        'UPDATE warehouses SET load_percent=MIN(98,load_percent+1) WHERE id=?',
      )
      .bind(chosen.id),
  );
  await db.batch(statements);
  return { orderCode: code, warehouseCode: chosen.code, reason };
}

async function refreshTaskRoute(db: D1, taskId: string) {
  const pending = (
    await db
      .prepare(
        "SELECT b.x,b.y FROM pick_task_items pti JOIN inventory_locations il ON il.id=pti.inventory_location_id JOIN bins b ON b.id=il.bin_id WHERE pti.pick_task_id=? AND pti.status!='PICKED' ORDER BY pti.sequence",
      )
      .bind(taskId)
      .all()
  ).results as Array<{ x: number; y: number }>;
  const route = warehouseAStarRoute(
    pending.map((point, index) => ({
      id: 'pending-' + index,
      x: point.x,
      y: point.y,
    })),
  );
  await db
    .prepare('UPDATE pick_tasks SET route_json=?,total_distance=? WHERE id=?')
    .bind(
      JSON.stringify(route.map((point) => ({ x: point.x, y: point.y }))),
      routeDistance(route) * 0.1,
      taskId,
    )
    .run();
}

async function confirmPick(db: D1, body: any) {
  const row = await db
    .prepare(
      'SELECT pti.*,p.barcode,p.id product_id,pt.order_id,pt.warehouse_id,pt.status task_status,il.bin_id FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN products p ON p.id=oi.product_id JOIN pick_tasks pt ON pt.id=pti.pick_task_id JOIN inventory_locations il ON il.id=pti.inventory_location_id WHERE pti.id=?',
    )
    .bind(body.itemId)
    .first<any>();
  if (!row) throw new Error('Pick item not found.');
  if (row.task_status === 'ASSIGNED')
    throw new Error('Start the pick task before confirming inventory.');
  if (String(body.barcode).trim() !== row.barcode)
    throw new Error(`WRONG PRODUCT — expected ${row.barcode}. Do not pick.`);
  const created = now();
  await db.batch([
    db
      .prepare(
        'UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand-?,quantity_reserved=quantity_reserved-? WHERE id=? AND quantity_on_hand>=? AND quantity_reserved>=?',
      )
      .bind(
        row.quantity,
        row.quantity,
        row.inventory_location_id,
        row.quantity,
        row.quantity,
      ),
    db
      .prepare("UPDATE pick_task_items SET status='PICKED' WHERE id=?")
      .bind(row.id),
    db
      .prepare(
        "UPDATE inventory_reservations SET status='CONSUMED' WHERE order_id=? AND inventory_location_id=?",
      )
      .bind(row.order_id, row.inventory_location_id),
    db
      .prepare(
        'INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id('MOV'),
        row.product_id,
        row.warehouse_id,
        row.bin_id,
        null,
        row.quantity,
        'OUTWARD',
        row.order_id,
        'EMP-1042',
        row.id,
        created,
        JSON.stringify({ verifiedBarcode: body.barcode }),
      ),
    db
      .prepare(
        "UPDATE pick_tasks SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM pick_task_items WHERE pick_task_id=? AND id<>? AND status!='PICKED') THEN 'COMPLETED' ELSE 'IN_PROGRESS' END WHERE id=?",
      )
      .bind(row.pick_task_id, row.id, row.pick_task_id),
    db
      .prepare(
        "UPDATE orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM pick_task_items WHERE pick_task_id=? AND id<>? AND status!='PICKED') THEN 'READY_FOR_DISPATCH' ELSE 'PICKING' END WHERE id=?",
      )
      .bind(row.pick_task_id, row.id, row.order_id),
  ]);
  await refreshTaskRoute(db, row.pick_task_id);
  return { verified: true };
}

async function reportMissing(db: D1, body: any) {
  const row = await db
    .prepare(
      'SELECT pti.*,oi.product_id,pt.order_id,pt.warehouse_id,il.bin_id FROM pick_task_items pti JOIN order_items oi ON oi.id=pti.order_item_id JOIN pick_tasks pt ON pt.id=pti.pick_task_id JOIN inventory_locations il ON il.id=pti.inventory_location_id WHERE pti.id=?',
    )
    .bind(body.itemId)
    .first<any>();
  if (!row) throw new Error('Pick item not found.');
  const alt = await db
    .prepare(
      'SELECT il.id,b.location_code,b.x,b.y FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.product_id=? AND il.warehouse_id=? AND il.id<>? AND il.quantity_on_hand-il.quantity_reserved>=? ORDER BY il.quantity_on_hand-il.quantity_reserved DESC LIMIT 1',
    )
    .bind(
      row.product_id,
      row.warehouse_id,
      row.inventory_location_id,
      row.quantity,
    )
    .first<any>();
  const resolution = alt
    ? `Alternative stock found at ${alt.location_code}`
    : 'Escalated to warehouse manager';
  await db.batch([
    db
      .prepare(
        'INSERT INTO inventory_exceptions(id,pick_task_item_id,product_id,warehouse_id,bin_id,employee_code,resolution,created_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .bind(
        id('EX'),
        row.id,
        row.product_id,
        row.warehouse_id,
        row.bin_id,
        'EMP-1042',
        resolution,
        now(),
      ),
    ...(alt
      ? [
          db
            .prepare(
              'UPDATE inventory_locations SET quantity_reserved=quantity_reserved-? WHERE id=? AND quantity_reserved>=?',
            )
            .bind(row.quantity, row.inventory_location_id, row.quantity),
          db
            .prepare(
              'UPDATE inventory_locations SET quantity_reserved=quantity_reserved+? WHERE id=? AND quantity_on_hand-quantity_reserved>=?',
            )
            .bind(row.quantity, alt.id, row.quantity),
          db
            .prepare(
              'UPDATE inventory_reservations SET inventory_location_id=? WHERE order_id=? AND inventory_location_id=? AND status=?',
            )
            .bind(alt.id, row.order_id, row.inventory_location_id, 'ACTIVE'),
          db
            .prepare(
              'UPDATE pick_task_items SET inventory_location_id=?,status=? WHERE id=?',
            )
            .bind(alt.id, 'REROUTED', row.id),
        ]
      : [
          db
            .prepare("UPDATE pick_task_items SET status='EXCEPTION' WHERE id=?")
            .bind(row.id),
        ]),
  ]);
  await refreshTaskRoute(db, row.pick_task_id);
  return { resolution, rerouted: Boolean(alt) };
}

async function startTask(db: D1, body: any) {
  const task = await db
    .prepare('SELECT id,order_id,status FROM pick_tasks WHERE id=?')
    .bind(body.taskId)
    .first<any>();
  if (!task) throw new Error('Pick task not found.');
  if (task.status !== 'ASSIGNED')
    throw new Error('Only assigned tasks can be started.');
  await db.batch([
    db
      .prepare(
        "UPDATE pick_tasks SET status='STARTED',employee_code='EMP-1042' WHERE id=? AND status='ASSIGNED'",
      )
      .bind(task.id),
    db
      .prepare(
        "UPDATE orders SET status='PICKING' WHERE id=? AND status='WAITING_FOR_PICK'",
      )
      .bind(task.order_id),
  ]);
  return { taskId: task.id, status: 'STARTED' };
}

async function transferInventory(db: D1, body: any) {
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error('Transfer quantity must be a positive integer.');
  const source = await db
    .prepare(
      'SELECT il.*,b.location_code FROM inventory_locations il JOIN bins b ON b.id=il.bin_id WHERE il.id=?',
    )
    .bind(body.sourceInventoryId)
    .first<any>();
  const destination = await db
    .prepare('SELECT * FROM bins WHERE location_code=?')
    .bind(String(body.destinationLocationCode))
    .first<any>();
  if (!source || !destination)
    throw new Error('Source inventory or destination bin not found.');
  if (source.warehouse_id !== destination.warehouse_id)
    throw new Error(
      'Adaptive slotting creates intra-warehouse transfers only.',
    );
  if (source.bin_id === destination.id)
    throw new Error('Source and destination bins must differ.');
  if (source.quantity_on_hand - source.quantity_reserved < quantity)
    throw new Error('Insufficient available stock for transfer.');
  const existing = await db
    .prepare(
      'SELECT id FROM inventory_locations WHERE product_id=? AND bin_id=?',
    )
    .bind(source.product_id, destination.id)
    .first<any>();
  const referenceId = 'TR-' + Date.now().toString().slice(-7);
  await db.batch([
    db
      .prepare(
        'UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand-? WHERE id=? AND quantity_on_hand-quantity_reserved>=?',
      )
      .bind(quantity, source.id, quantity),
    ...(existing
      ? [
          db
            .prepare(
              'UPDATE inventory_locations SET quantity_on_hand=quantity_on_hand+? WHERE id=?',
            )
            .bind(quantity, existing.id),
        ]
      : [
          db
            .prepare(
              'INSERT INTO inventory_locations(id,product_id,warehouse_id,bin_id,quantity_on_hand,quantity_reserved) VALUES(?,?,?,?,?,0)',
            )
            .bind(
              id('INV'),
              source.product_id,
              source.warehouse_id,
              destination.id,
              quantity,
            ),
        ]),
    db
      .prepare(
        'INSERT INTO stock_movements(id,product_id,warehouse_id,source_bin_id,destination_bin_id,quantity,movement_type,order_id,employee_code,reference_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id('MOV'),
        source.product_id,
        source.warehouse_id,
        source.bin_id,
        destination.id,
        quantity,
        'TRANSFER',
        null,
        'EMP-1042',
        referenceId,
        now(),
        JSON.stringify({ reason: 'ADAPTIVE_SLOTTING' }),
      ),
  ]);
  return { referenceId, destinationLocationCode: destination.location_code };
}

async function simulateSurge(db: D1) {
  let created = 0;
  for (let i = 0; i < 25; i++) {
    try {
      await createOrder(db, {
        customerName: 'Simulation ' + String(i + 1).padStart(2, '0'),
        items: [{ productId: showcase[i % showcase.length][0], quantity: 1 }],
        isSimulated: true,
      });
      created++;
    } catch {
      break;
    }
  }
  if (!created)
    throw new Error('The surge could not reserve any additional inventory.');
  return { created };
}

export async function GET() {
  try {
    const db = env.DB as D1;
    await seed(db);
    return NextResponse.json(await state(db));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Database error' },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const db = env.DB as D1;
    await seed(db);
    const body: any = await req.json();
    let result;
    if (body.action === 'createOrder') result = await createOrder(db, body);
    else if (body.action === 'confirmPick')
      result = await confirmPick(db, body);
    else if (body.action === 'reportMissing')
      result = await reportMissing(db, body);
    else if (body.action === 'startTask') result = await startTask(db, body);
    else if (body.action === 'transferInventory')
      result = await transferInventory(db, body);
    else if (body.action === 'simulateSurge') result = await simulateSurge(db);
    else throw new Error('Unsupported action.');
    return NextResponse.json({ ok: true, result, state: await state(db) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Operation failed' },
      { status: 400 },
    );
  }
}
