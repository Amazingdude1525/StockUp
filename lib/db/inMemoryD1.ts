type BindValue = string | number | boolean | null | undefined;

class MemoryStatement {
  private sql: string;
  private params: BindValue[];
  private dbStore: Map<string, any[]>;

  constructor(sql: string, params: BindValue[], dbStore: Map<string, any[]>) {
    this.sql = sql;
    this.params = params;
    this.dbStore = dbStore;
  }

  bind(...args: BindValue[]) {
    return new MemoryStatement(this.sql, args, this.dbStore);
  }

  async first<T = any>(): Promise<T | null> {
    const res = await this.all<T>();
    return res.results[0] ?? null;
  }

  private extractMainTable(sql: string): string {
    const sqlTrimmed = sql.trim();
    const matches = [...sqlTrimmed.matchAll(/\bfrom\s+([a-z0-9_]+)\b(?!\s*\))/gi)];
    if (matches.length > 0) {
      return matches[matches.length - 1][1].toLowerCase();
    }
    const anyFrom = sqlTrimmed.match(/\bfrom\s+([a-z0-9_]+)/i);
    return anyFrom ? anyFrom[1].toLowerCase() : '';
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    const sqlLower = this.sql.toLowerCase().trim();
    const tableName = this.extractMainTable(this.sql);

    if (sqlLower.includes('count(*)') && !sqlLower.includes('from warehouses')) {
      const table = this.dbStore.get(tableName) || [];
      return { results: [{ count: table.length } as any] };
    }

    const table = this.dbStore.get(tableName) || [];
    let rows = table.map((r) => ({ ...r }));

    if (tableName === 'warehouses') {
      const orders = this.dbStore.get('orders') || [];
      const invLocs = this.dbStore.get('inventory_locations') || [];
      const products = this.dbStore.get('products') || [];

      rows = rows.map((w) => {
        const activeOrders = orders.filter(
          (o) => o.warehouse_id === w.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED',
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
          low_stock: lowStock,
        };
      });
    }

    if (tableName === 'inventory_locations') {
      const warehouses = this.dbStore.get('warehouses') || [];
      const bins = this.dbStore.get('bins') || [];
      rows = rows.map((il) => {
        const w = warehouses.find((wh) => wh.id === il.warehouse_id);
        const b = bins.find((bin) => bin.id === il.bin_id);
        return {
          ...il,
          warehouse_code: w?.code || il.warehouse_id,
          location_code: b?.location_code || il.bin_id,
          row_code: b?.row_code || '',
          bin_code: b?.code || '',
          x: b?.x ?? 0,
          y: b?.y ?? 0,
        };
      });
    }

    if (tableName === 'stock_movements') {
      const products = this.dbStore.get('products') || [];
      const bins = this.dbStore.get('bins') || [];
      const orders = this.dbStore.get('orders') || [];
      rows = rows.map((sm) => {
        const p = products.find((prod) => prod.id === sm.product_id);
        const b = bins.find((bin) => bin.id === (sm.destination_bin_id || sm.source_bin_id));
        const o = orders.find((ord) => ord.id === sm.order_id);
        return {
          ...sm,
          product_name: p?.name || sm.product_id,
          location_code: b?.location_code || '',
          order_code: o?.code || '',
        };
      });
    }

    if (tableName === 'orders') {
      const warehouses = this.dbStore.get('warehouses') || [];
      const orderItems = this.dbStore.get('order_items') || [];
      rows = rows.map((o) => {
        const w = warehouses.find((wh) => wh.id === o.warehouse_id);
        const items = orderItems.filter((oi) => oi.order_id === o.id);
        const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        return {
          ...o,
          warehouse_code: w?.code || o.warehouse_id,
          item_count: itemCount,
        };
      });
    }

    if (tableName === 'pick_tasks') {
      const orders = this.dbStore.get('orders') || [];
      rows = rows.map((pt) => {
        const o = orders.find((ord) => ord.id === pt.order_id);
        return {
          ...pt,
          order_code: o?.code || '',
        };
      });
    }

    if (tableName === 'pick_task_items') {
      const orderItems = this.dbStore.get('order_items') || [];
      const products = this.dbStore.get('products') || [];
      const invLocs = this.dbStore.get('inventory_locations') || [];
      const bins = this.dbStore.get('bins') || [];
      rows = rows.map((pti) => {
        const oi = orderItems.find((item) => item.id === pti.order_item_id);
        const p = products.find((prod) => prod.id === (oi?.product_id || pti.product_id));
        const il = invLocs.find((loc) => loc.id === pti.inventory_location_id);
        const b = bins.find((bin) => bin.id === il?.bin_id);
        return {
          ...pti,
          product_id: p?.id || oi?.product_id || '',
          product_name: p?.name || '',
          sku: p?.sku || '',
          barcode: p?.barcode || '',
          inventory_id: il?.id || pti.inventory_location_id,
          location_code: b?.location_code || '',
          row_code: b?.row_code || '',
          bin_code: b?.code || '',
          x: b?.x ?? 0,
          y: b?.y ?? 0,
        };
      });
    }

    if (tableName === 'staff_access') {
      if (this.params.length >= 2) {
        const [code, whCode] = this.params;
        rows = rows.filter((r) => r.code === code && r.warehouse_code === whCode);
      }
    }

    return { results: rows as T[] };
  }

  async run(): Promise<{ success: boolean }> {
    const sqlTrim = this.sql.trim();
    const sqlLower = sqlTrim.toLowerCase();

    if (sqlLower.startsWith('create table')) {
      const match = sqlTrim.match(/create table (?:if not exists )?([a-z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1].toLowerCase();
        if (!this.dbStore.has(tableName)) {
          this.dbStore.set(tableName, []);
        }
      }
    }

    if (sqlLower.startsWith('insert')) {
      const tableMatch = sqlTrim.match(/into\s+([a-z0-9_]+)\s*\(([^)]+)\)/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        const cols = tableMatch[2].split(',').map((c) => c.trim().toLowerCase());
        const table = this.dbStore.get(tableName) || [];
        const row: Record<string, any> = {};
        cols.forEach((col, idx) => {
          row[col] = this.params[idx] !== undefined ? this.params[idx] : null;
        });

        const existingIdx = table.findIndex(
          (r) => (r.id && row.id && r.id === row.id) || (r.code && row.code && r.code === row.code),
        );
        if (existingIdx >= 0) {
          if (!sqlLower.includes('ignore')) {
            table[existingIdx] = { ...table[existingIdx], ...row };
          }
        } else {
          table.push(row);
        }
        this.dbStore.set(tableName, table);
      }
    }

    if (sqlLower.startsWith('update')) {
      const tableMatch = sqlTrim.match(/update\s+([a-z0-9_]+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        const table = this.dbStore.get(tableName) || [];
        if (this.params.length > 0) {
          const targetId = this.params[this.params.length - 1];
          const targetRow = table.find((r) => r.id === targetId || r.code === targetId);
          if (targetRow) {
            if (sqlLower.includes('quantity_on_hand=quantity_on_hand-')) {
              const qty = Number(this.params[0]) || 0;
              targetRow.quantity_on_hand = Math.max(0, (targetRow.quantity_on_hand || 0) - qty);
              targetRow.quantity_reserved = Math.max(0, (targetRow.quantity_reserved || 0) - qty);
            }
            if (sqlLower.includes('quantity_reserved=quantity_reserved+')) {
              const qty = Number(this.params[0]) || 0;
              targetRow.quantity_reserved = (targetRow.quantity_reserved || 0) + qty;
            }
            if (sqlLower.includes('status=')) {
              const statusVal = String(this.params[0] || 'COMPLETED');
              targetRow.status = statusVal;
            }
          }
        }
        this.dbStore.set(tableName, table);
      }
    }

    return { success: true };
  }
}

class InMemoryD1Database {
  private dbStore = new Map<string, any[]>();

  prepare(sql: string) {
    return new MemoryStatement(sql, [], this.dbStore);
  }

  async batch(statements: MemoryStatement[]) {
    for (const stmt of statements) {
      await stmt.run();
    }
    return [];
  }
}

const globalMemoryDb = new InMemoryD1Database();

export function getInMemoryD1() {
  return globalMemoryDb as unknown as D1Database;
}
