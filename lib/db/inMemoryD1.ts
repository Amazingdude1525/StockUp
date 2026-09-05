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

  async all<T = any>(): Promise<{ results: T[] }> {
    const sqlLower = this.sql.toLowerCase().trim();

    if (sqlLower.startsWith('select count(*)')) {
      const match = sqlLower.match(/from\s+([a-z0-9_]+)/);
      const tableName = match ? match[1] : '';
      const table = this.dbStore.get(tableName) || [];
      return { results: [{ count: table.length } as any] };
    }

    if (sqlLower.startsWith('select')) {
      const match = sqlLower.match(/from\s+([a-z0-9_]+)/);
      const tableName = match ? match[1] : '';
      const table = this.dbStore.get(tableName) || [];
      return { results: [...table] as T[] };
    }

    return { results: [] };
  }

  async run(): Promise<{ success: boolean }> {
    const sqlLower = this.sql.toLowerCase().trim();

    if (sqlLower.startsWith('create table')) {
      const match = sqlLower.match(/create table (if not exists )?([a-z0-9_]+)/i);
      if (match && match[2]) {
        const tableName = match[2].toLowerCase();
        if (!this.dbStore.has(tableName)) {
          this.dbStore.set(tableName, []);
        }
      }
    }

    if (sqlLower.startsWith('insert')) {
      const match = sqlLower.match(/into\s+([a-z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1].toLowerCase();
        const table = this.dbStore.get(tableName) || [];
        table.push(this.params);
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
