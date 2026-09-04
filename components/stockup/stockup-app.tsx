'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleGauge,
  Command,
  Crosshair,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Map,
  MapPin,
  Minus,
  PackageCheck,
  PackageSearch,
  Plus,
  Route,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Waves,
  X,
} from 'lucide-react';
import type { AppState, PickTask, Product, Warehouse } from '@/lib/types';

type View =
  | 'network'
  | 'warehouse'
  | 'shop'
  | 'orders'
  | 'inventory'
  | 'worker'
  | 'movements'
  | 'intelligence';
const nav = [
  ['network', 'Network Map', Map],
  ['orders', 'Orders', PackageSearch],
  ['inventory', 'Inventory', Boxes],
  ['warehouse', 'Warehouses', Building2],
  ['worker', 'Worker Picking', ListChecks],
  ['movements', 'Movements', ArrowLeftRight],
  ['intelligence', 'Intelligence', Sparkles],
] as const;
const money = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    p / 100,
  );
const statusClass = (s: string) =>
  s.includes('READY') || s === 'COMPLETED'
    ? 'ok'
    : s.includes('EXCEPTION') || s === 'WARNING'
      ? 'warn'
      : 'blue';

export default function StockUpApp() {
  const [data, setData] = useState<AppState | null>(null),
    [view, setView] = useState<View>('network'),
    [warehouse, setWarehouse] = useState('WH02'),
    [query, setQuery] = useState(''),
    [cart, setCart] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/stockup');
      const j: any = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j as AppState);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load StockUp data.');
    }
  }, []);
  useEffect(() => {
    void load();
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [load]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options?: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const ac = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'search_stockup_inventory',
          title: 'Search StockUp inventory',
          description:
            'Search product, SKU, barcode, or physical warehouse location and show matching live inventory.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: (input: unknown) => {
            const q = String((input as { query: string }).query || '');
            setQuery(q);
            setView('inventory');
            return { query: q, visibleView: 'inventory' };
          },
        },
        { signal: ac.signal },
      ),
    ).catch(() => {});
    return () => ac.abort();
  }, []);
  const act = async (payload: unknown) => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/stockup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        j: any = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j.state as AppState);
      return j.result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const openWarehouse = (code: string) => {
    setWarehouse(code);
    setView('warehouse');
  };
  const searchResults = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.toLowerCase();
    return data.products.filter((p) =>
      [
        p.name,
        p.sku,
        p.barcode,
        ...p.locations.map((l) => l.locationCode),
      ].some((v) => v.toLowerCase().includes(q)),
    );
  }, [data, query]);
  if (!data) return <Loading error={error} retry={load} />;
  const selectedWh =
    data.warehouses.find((w) => w.code === warehouse) ?? data.warehouses[0];
  return (
    <main className="min-h-screen bg-[#f4f7fa] text-[#14213d]">
      <Sidebar view={view} onView={setView} />
      <section className="lg:pl-[232px]">
        <Topbar
          searchRef={searchRef}
          query={query}
          setQuery={setQuery}
          onSearch={() => setView('inventory')}
          cartCount={Object.values(cart).reduce((a, b) => a + b, 0)}
          openCart={() => setView('shop')}
          onAlerts={() => setView('intelligence')}
          onSimulation={async () => {
            try {
              const result = await act({ action: 'simulateSurge' });
              setNotice(
                result.created +
                  ' simulated orders were reserved, allocated, and routed.',
              );
              setView('orders');
            } catch {}
          }}
        />
        <div className="mx-auto max-w-[1600px] p-4 md:p-7 lg:p-8">
          {notice && (
            <div className="mb-5 flex items-start justify-between rounded-xl border border-[#bde6cb] bg-[#ecfbf2] px-4 py-3 text-sm font-semibold text-[#176b3a]">
              <span>{notice}</span>
              <button onClick={() => setNotice('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#f4c7c7] bg-[#fff2f2] px-4 py-3 text-sm font-semibold text-[#a32b2b]">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}
          {view === 'network' && (
            <NetworkView data={data} openWarehouse={openWarehouse} />
          )}
          {view === 'warehouse' && (
            <WarehouseView
              warehouse={selectedWh}
              products={data.products}
              task={data.tasks.find((t) =>
                t.items.some((i) => i.locationCode.startsWith(selectedWh.code)),
              )}
              onChange={openWarehouse}
              onInventory={() => {
                setQuery(selectedWh.code);
                setView('inventory');
              }}
              onPicks={() => setView('worker')}
            />
          )}
          {view === 'shop' && (
            <ShopView
              products={data.products}
              cart={cart}
              setCart={setCart}
              busy={busy}
              checkout={async () => {
                const items = Object.entries(cart)
                  .filter(([, q]) => q > 0)
                  .map(([productId, quantity]) => ({ productId, quantity }));
                try {
                  const result = await act({
                    action: 'createOrder',
                    items,
                    customerName: 'Priya Sharma',
                  });
                  setCart({});
                  setNotice(
                    `${result.orderCode} created and allocated to ${result.warehouseCode}. ${result.reason}`,
                  );
                  setView('orders');
                } catch {}
              }}
            />
          )}
          {view === 'orders' && (
            <OrdersView
              data={data}
              onOpen={(code) => {
                setWarehouse(code);
                setView('warehouse');
              }}
            />
          )}
          {view === 'inventory' && (
            <InventoryView
              products={query ? searchResults : data.products}
              query={query}
              onMap={(code) => openWarehouse(code)}
            />
          )}
          {view === 'worker' && (
            <WorkerView
              task={data.tasks[0]}
              busy={busy}
              onStart={async (taskId) => {
                try {
                  await act({ action: 'startTask', taskId });
                  setNotice(
                    'Picking started. The first graph-routed stop is active.',
                  );
                } catch {}
              }}
              onConfirm={async (itemId, barcode) => {
                try {
                  await act({ action: 'confirmPick', itemId, barcode });
                  setNotice(
                    'Pick verified. Inventory and movement ledger updated.',
                  );
                } catch {}
              }}
              onMissing={async (itemId) => {
                try {
                  const result = await act({ action: 'reportMissing', itemId });
                  setNotice(
                    result.rerouted
                      ? 'Inventory exception recorded. ' +
                          result.resolution +
                          '. Route recalculated.'
                      : 'Inventory exception recorded. ' +
                          result.resolution +
                          '.',
                  );
                } catch {}
              }}
            />
          )}
          {view === 'movements' && <MovementsView data={data} />}
          {view === 'intelligence' && (
            <IntelligenceView
              data={data}
              busy={busy}
              onSimulation={async () => {
                try {
                  const result = await act({ action: 'simulateSurge' });
                  setNotice(
                    result.created +
                      ' simulated orders created with real reservations and pick tasks.',
                  );
                } catch {}
              }}
              onTransfer={async (
                sourceInventoryId,
                destinationLocationCode,
                quantity,
              ) => {
                try {
                  const result = await act({
                    action: 'transferInventory',
                    sourceInventoryId,
                    destinationLocationCode,
                    quantity,
                  });
                  setNotice(
                    result.referenceId +
                      ': ' +
                      quantity +
                      ' units transferred to ' +
                      destinationLocationCode +
                      '; movement ledger updated.',
                  );
                  setView('movements');
                } catch {}
              }}
            />
          )}
        </div>
      </section>
      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0d1b35]/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 font-bold shadow-xl">
            <LoaderCircle className="animate-spin" size={20} />
            Committing operation…
          </div>
        </div>
      )}
    </main>
  );
}

function Loading({ error, retry }: { error: string; retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fa]">
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#12213f] text-white">
          <Boxes />
        </div>
        <h1 className="text-xl font-black">Loading StockUp operations</h1>
        {error ? (
          <>
            <p className="mt-2 max-w-md text-sm text-red-600">{error}</p>
            <button
              onClick={retry}
              className="mt-4 rounded-lg bg-[#1262e3] px-4 py-2 text-sm font-bold text-white"
            >
              Retry
            </button>
          </>
        ) : (
          <LoaderCircle className="mx-auto mt-4 animate-spin text-[#1262e3]" />
        )}
      </div>
    </main>
  );
}
function Sidebar({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[232px] border-r border-[#dfe5ec] bg-white lg:flex lg:flex-col">
      <div className="flex h-[74px] items-center gap-3 border-b border-[#e8edf2] px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-[#12213f] text-white">
          <Boxes size={19} />
        </div>
        <div>
          <p className="text-[17px] font-black tracking-[-.03em]">STOCKUP</p>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7c8799]">
            Command Center
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#98a2b2]">
          Operations
        </p>
        {nav.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => onView(key)}
            className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${view === key ? 'bg-[#eaf2ff] text-[#1262e3]' : 'text-[#536174] hover:bg-[#f4f6f8]'}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-[#e8edf2] p-3">
        <div className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#8a96a7]">
          <Settings size={18} />
          Allocation weights · managed
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#f6f8fa] p-3">
          <div className="grid size-9 place-items-center rounded-full bg-[#12213f] text-xs font-bold text-white">
            AK
          </div>
          <div>
            <p className="text-sm font-bold">Arjun Kapoor</p>
            <p className="text-xs text-[#7c8799]">Network Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
function Topbar({
  searchRef,
  query,
  setQuery,
  onSearch,
  cartCount,
  openCart,
  onAlerts,
  onSimulation,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  cartCount: number;
  openCart: () => void;
  onAlerts: () => void;
  onSimulation: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-[74px] items-center gap-3 border-b border-[#dfe5ec] bg-white/95 px-4 backdrop-blur md:px-8">
      <div className="grid size-9 place-items-center rounded-xl bg-[#12213f] text-white lg:hidden">
        <Boxes size={18} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        className="relative max-w-[540px] flex-1"
      >
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]"
          size={17}
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, SKU, barcode or location"
          className="h-10 w-full rounded-lg border border-[#dce2e9] bg-[#f8fafc] pl-10 pr-16 text-sm outline-none focus:border-[#1262e3] focus:ring-2 focus:ring-[#1262e3]/10"
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#7c8799]">
          <Command size={10} />K
        </span>
      </form>
      <button
        aria-label="Open operational alerts"
        onClick={onAlerts}
        className="ml-auto grid size-10 place-items-center rounded-lg border bg-white text-[#556274]"
      >
        <Bell size={17} />
      </button>
      <button
        onClick={onSimulation}
        className="hidden h-10 items-center gap-2 rounded-lg border border-[#cfe0f5] bg-[#edf5ff] px-3 text-xs font-black text-[#1262e3] md:flex"
      >
        <CircleGauge size={16} /> Simulate surge
      </button>
      <button
        onClick={openCart}
        className="relative grid size-10 place-items-center rounded-lg bg-[#12213f] text-white"
      >
        <ShoppingCart size={17} />
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#7ed957] text-[10px] font-black text-[#12213f]">
            {cartCount}
          </span>
        )}
      </button>
    </header>
  );
}

function PageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#1262e3]">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black tracking-[-.04em] text-[#12213f]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#67758a]">{sub}</p>
      </div>
      {action}
    </div>
  );
}
function NetworkView({
  data,
  openWarehouse,
}: {
  data: AppState;
  openWarehouse: (c: string) => void;
}) {
  const totalOrders = data.orders.filter(
      (o) => !['COMPLETED', 'CANCELLED'].includes(o.status),
    ).length,
    totalLow = data.warehouses.reduce((s, w) => s + w.lowStock, 0);
  return (
    <>
      <PageHead
        eyebrow="All systems live"
        title="StockUp Network Map"
        sub="Choose a warehouse to inspect inventory and active fulfilment routes."
        action={
          <Stats
            values={[
              ['Live orders', totalOrders],
              [
                'Network load',
                `${Math.round(data.warehouses.reduce((s, w) => s + w.loadPercent, 0) / 3)}%`,
              ],
              ['Low stock', totalLow],
            ]}
          />
        }
      />
      <div className="network-map">
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 620"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="grid"
              width="34"
              height="34"
              patternUnits="userSpaceOnUse"
            >
              <path d="M34 0H0V34" fill="none" stroke="#dce5ed" />
            </pattern>
          </defs>
          <rect width="1200" height="620" fill="url(#grid)" />
          <path
            d="M70 120C260 150 340 71 527 125S832 127 1140 81M44 483c203-50 282-8 450-60s368 69 670 6"
            fill="none"
            stroke="#d5e0e9"
            strokeWidth="20"
            opacity=".75"
          />
          <path
            d="M110 542C320 410 371 430 512 356S746 267 1118 184"
            fill="none"
            stroke="white"
            strokeWidth="9"
          />
          <path
            d="M270 193L682 362L939 180"
            fill="none"
            stroke="#1262e3"
            strokeDasharray="5 8"
            strokeWidth="2.5"
            opacity=".6"
          />
        </svg>
        <div className="absolute left-5 top-5 flex rounded-lg border bg-white p-1.5 shadow-sm">
          <span className="rounded-md bg-[#12213f] px-3 py-2 text-xs font-bold text-white">
            Network
          </span>
          <span className="px-3 py-2 text-xs font-bold text-[#637084]">
            Capacity
          </span>
        </div>
        {data.warehouses.map((w, i) => (
          <WarehouseMarker
            key={w.code}
            wh={w}
            pos={
              [
                [24, 31],
                [57, 58],
                [78, 29],
              ][i]
            }
            onClick={() => openWarehouse(w.code)}
          />
        ))}
        <MapLegend />
      </div>
    </>
  );
}
function Stats({ values }: { values: Array<[string, string | number]> }) {
  return (
    <div className="flex items-center gap-5 rounded-xl border bg-white px-5 py-3 shadow-sm">
      {values.map(([l, v], i) => (
        <div key={l} className="flex items-center gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#8792a3]">
              {l}
            </p>
            <p className="text-xl font-black">{v}</p>
          </div>
          {i < values.length - 1 && <div className="h-8 w-px bg-[#e2e7ed]" />}
        </div>
      ))}
    </div>
  );
}
function WarehouseMarker({
  wh,
  pos,
  onClick,
}: {
  wh: Warehouse;
  pos: number[];
  onClick: () => void;
}) {
  const warn = wh.loadPercent >= 80;
  return (
    <button
      onClick={onClick}
      style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
      className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
    >
      <div className="mb-2 w-[185px] rounded-xl border bg-white p-4 shadow-[0_8px_25px_rgba(20,33,61,.16)] transition group-hover:-translate-y-1 group-hover:border-[#1262e3]">
        <div className="flex justify-between">
          <div>
            <p className="font-black">{wh.code}</p>
            <p className="text-xs text-[#728095]">{wh.city} Hub</p>
          </div>
          <span
            className={`mt-1 size-2.5 rounded-full ${warn ? 'bg-[#f59e0b]' : 'bg-[#37b46a]'}`}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 border-t pt-3 text-sm">
          <Metric l="Load" v={`${wh.loadPercent}%`} />
          <Metric l="Orders" v={wh.activeOrders} />
          <Metric l="Low" v={wh.lowStock} />
        </div>
      </div>
      <div
        className={`mx-auto grid size-11 place-items-center rounded-full border-[5px] border-white text-white shadow-lg ${warn ? 'bg-[#f59e0b]' : 'bg-[#1262e3]'}`}
      >
        <Building2 size={17} />
      </div>
    </button>
  );
}
function Metric({ l, v }: { l: string; v: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-[#929cab]">{l}</p>
      <p className="font-black">{v}</p>
    </div>
  );
}
function MapLegend() {
  return (
    <div className="absolute bottom-5 left-5 flex gap-4 rounded-lg border bg-white px-4 py-3 text-xs font-semibold text-[#59677a] shadow-sm">
      <span className="flex items-center gap-2">
        <i className="size-2.5 rounded-full bg-[#37b46a]" />
        Healthy
      </span>
      <span className="flex items-center gap-2">
        <i className="size-2.5 rounded-full bg-[#f59e0b]" />
        Warning
      </span>
      <span className="flex items-center gap-2">
        <i className="size-2.5 rounded-full bg-[#e5484d]" />
        Critical
      </span>
    </div>
  );
}

function WarehouseView({
  warehouse,
  products,
  task,
  onChange,
  onInventory,
  onPicks,
}: {
  warehouse: Warehouse;
  products: Product[];
  task?: PickTask;
  onChange: (c: string) => void;
  onInventory: () => void;
  onPicks: () => void;
}) {
  const [zoom, setZoom] = useState(1),
    [selected, setSelected] = useState<string | null>(null);
  const bins = products.flatMap((p) =>
    p.locations
      .filter((l) => l.warehouseCode === warehouse.code)
      .map((l) => ({ ...l, product: p })),
  );
  return (
    <>
      <PageHead
        eyebrow={`${warehouse.code} · ${warehouse.status}`}
        title={warehouse.name}
        sub={`${warehouse.city} · Check-in ${warehouse.checkinCode} · Graph-routed indoor navigation`}
        action={
          <select
            value={warehouse.code}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 rounded-lg border bg-white px-3 text-sm font-bold"
          >
            <option>WH01</option>
            <option>WH02</option>
            <option>WH03</option>
          </select>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="overflow-hidden rounded-2xl border bg-[#eef3f7] shadow-sm">
          <div className="flex items-center justify-between border-b bg-white px-4 py-3">
            <div className="flex gap-2">
              <span className="rounded-md bg-[#12213f] px-3 py-2 text-xs font-bold text-white">
                Map
              </span>
              <button
                onClick={onInventory}
                className="px-3 py-2 text-xs font-bold text-[#647187]"
              >
                Inventory
              </button>
              <button
                onClick={onPicks}
                className="px-3 py-2 text-xs font-bold text-[#647187]"
              >
                Active picks
              </button>
            </div>
            <div className="flex overflow-hidden rounded-lg border">
              <button
                aria-label="Adjust warehouse map zoom"
                onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                className="grid size-9 place-items-center border-r bg-white"
              >
                <Plus size={16} />
              </button>
              <button
                aria-label="Adjust warehouse map zoom"
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.15))}
                className="grid size-9 place-items-center border-r bg-white"
              >
                <Minus size={16} />
              </button>
              <button
                aria-label="Adjust warehouse map zoom"
                onClick={() => setZoom(1)}
                className="grid size-9 place-items-center bg-white"
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>
          <div className="warehouse-canvas">
            <svg
              viewBox="0 0 820 620"
              className="h-full w-full"
              style={{ transform: `scale(${zoom})` }}
            >
              <rect
                x="24"
                y="22"
                width="772"
                height="572"
                rx="18"
                fill="#f7fafc"
                stroke="#aebbc9"
                strokeWidth="3"
              />
              <rect
                x="45"
                y="485"
                width="150"
                height="82"
                rx="10"
                fill="#dcecff"
                stroke="#1262e3"
              />
              <text x="120" y="522" textAnchor="middle" className="map-label">
                CHECK-IN
              </text>
              <text x="120" y="542" textAnchor="middle" className="map-small">
                {warehouse.checkinCode}
              </text>
              {[80, 185, 290, 395].map((y, r) => (
                <g key={y}>
                  <rect
                    x="115"
                    y={y}
                    width="595"
                    height="52"
                    rx="5"
                    fill="#263956"
                  />
                  <text
                    x="82"
                    y={y + 31}
                    textAnchor="middle"
                    className="row-label"
                  >
                    R0{r + 1}
                  </text>
                  {[130, 240, 350, 460, 570, 680].map((x, b) => (
                    <rect
                      key={x}
                      x={x}
                      y={y + 7}
                      width="70"
                      height="38"
                      rx="3"
                      fill="#405472"
                      stroke="#627795"
                    />
                  ))}
                </g>
              ))}
              <path
                d="M120 485 L120 455 L745 455 L745 350 L85 350 L85 245 L745 245 L745 140 L85 140"
                fill="none"
                stroke="#cbd7e2"
                strokeWidth="5"
                strokeDasharray="4 8"
              />
              {task && (
                <polyline
                  points={task.route.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#1473e6"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <g>
                <circle
                  cx="90"
                  cy="525"
                  r="13"
                  fill="#12213f"
                  stroke="white"
                  strokeWidth="5"
                />
                <circle cx="90" cy="525" r="3" fill="#7ed957" />
              </g>
              {bins.map((b, i) => (
                <g
                  key={b.inventoryId}
                  onClick={() => setSelected(b.inventoryId)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={b.x + 37}
                    cy={b.y + 21}
                    r={selected === b.inventoryId ? 15 : 10}
                    fill={
                      b.available <= 10 ? '#ef4444' : i < 3 ? '#7ed957' : '#fff'
                    }
                    stroke={selected === b.inventoryId ? '#1262e3' : '#12213f'}
                    strokeWidth={selected === b.inventoryId ? 5 : 3}
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#12213f] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[.13em] text-[#9fb1cb]">
              Route performance
            </p>
            <p className="mt-2 text-3xl font-black">
              {Math.round(task?.totalDistance ?? 184)} m
            </p>
            <p className="text-sm text-[#b9c8dc]">
              {task?.items.length ?? 0} pick stops · A* + 2-opt
            </p>
            <div className="mt-4 rounded-lg bg-white/10 p-3 text-sm">
              <span className="font-bold text-[#a8ee80]">Graph-safe route</span>{' '}
              follows walkable corridors only
            </div>
          </div>
          {selected ? (
            <BinCard bin={bins.find((b) => b.inventoryId === selected)!} />
          ) : (
            <div className="rounded-2xl border bg-white p-5">
              <MapPin className="mb-3 text-[#1262e3]" />
              <h3 className="font-black">Select a bin</h3>
              <p className="mt-1 text-sm text-[#69768a]">
                Click any inventory marker to inspect exact stock and
                utilization.
              </p>
            </div>
          )}
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-bold uppercase text-[#8994a5]">
              Operational state
            </p>
            <div className="mt-3 space-y-3">
              <Health
                label="Warehouse load"
                value={`${warehouse.loadPercent}%`}
                tone={warehouse.loadPercent > 80 ? 'warn' : 'ok'}
              />
              <Health label="Active orders" value={warehouse.activeOrders} />
              <Health
                label="Low-stock locations"
                value={warehouse.lowStock}
                tone={warehouse.lowStock > 5 ? 'warn' : 'ok'}
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function BinCard({
  bin,
}: {
  bin: Product['locations'][number] & { product: Product };
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#1262e3]">
            {bin.locationCode}
          </p>
          <h3 className="mt-1 font-black">{bin.product.name}</h3>
        </div>
        <span className={`status ${bin.available <= 10 ? 'warn' : 'ok'}`}>
          {bin.available <= 10 ? 'LOW' : 'HEALTHY'}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric l="On hand" v={bin.onHand} />
        <Metric l="Reserved" v={bin.reserved} />
        <Metric l="Available" v={bin.available} />
      </div>
      <div className="mt-4 h-2 rounded-full bg-[#edf1f5]">
        <div
          className="h-full rounded-full bg-[#1262e3]"
          style={{ width: `${Math.min(100, bin.onHand / 1.2)}%` }}
        />
      </div>
    </div>
  );
}
function Health({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#68768a]">{label}</span>
      <span
        className={`font-black ${tone === 'warn' ? 'text-[#d97706]' : tone === 'ok' ? 'text-[#23884e]' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function ShopView({
  products,
  cart,
  setCart,
  busy,
  checkout,
}: {
  products: Product[];
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  busy: boolean;
  checkout: () => void;
}) {
  const items = products.filter((p) => cart[p.id] > 0),
    total = items.reduce((s, p) => s + (cart[p.id] ?? 0) * p.pricePaise, 0);
  return (
    <>
      <PageHead
        eyebrow="Customer panel"
        title="Shop from live inventory"
        sub="Every checkout creates a reserved warehouse order and pick task."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#edf4ff] text-[#1262e3]">
                <PackageCheck />
              </div>
              <p className="text-xs font-bold uppercase text-[#8994a5]">
                {p.category} · {p.sku}
              </p>
              <h3 className="mt-1 min-h-12 text-lg font-black">{p.name}</h3>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-black">{money(p.pricePaise)}</p>
                <p className="text-xs font-bold text-[#24834a]">
                  {p.locations.reduce((s, l) => s + l.available, 0)} available
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border p-1">
                <button
                  onClick={() =>
                    setCart((c) => ({
                      ...c,
                      [p.id]: Math.max(0, (c[p.id] ?? 0) - 1),
                    }))
                  }
                  className="grid size-9 place-items-center"
                >
                  <Minus size={15} />
                </button>
                <span className="font-black">{cart[p.id] ?? 0}</span>
                <button
                  onClick={() =>
                    setCart((c) => ({
                      ...c,
                      [p.id]: Math.min(20, (c[p.id] ?? 0) + 1),
                    }))
                  }
                  className="grid size-9 place-items-center rounded-md bg-[#12213f] text-white"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-24">
          <div className="flex items-center gap-2">
            <ShoppingCart size={19} />
            <h2 className="text-lg font-black">Order basket</h2>
          </div>
          <div className="my-5 space-y-3">
            {items.length ? (
              items.map((p) => (
                <div key={p.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {p.name} <b>×{cart[p.id]}</b>
                  </span>
                  <b>{money(p.pricePaise * cart[p.id])}</b>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-[#f5f7fa] p-4 text-sm text-[#7a8799]">
                Add items to start an order.
              </p>
            )}
          </div>
          <div className="flex justify-between border-t pt-4 text-lg font-black">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <button
            disabled={!items.length || busy}
            onClick={checkout}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1262e3] font-black text-white disabled:opacity-40"
          >
            Allocate & checkout <ChevronRight size={17} />
          </button>
          <p className="mt-3 text-center text-xs text-[#7b8798]">
            Transactional reservation · no overselling
          </p>
        </aside>
      </div>
    </>
  );
}
function OrdersView({
  data,
  onOpen,
}: {
  data: AppState;
  onOpen: (w: string) => void;
}) {
  return (
    <>
      <PageHead
        eyebrow="Fulfilment control"
        title="Orders & allocation"
        sub="Deterministic warehouse selection with a human-readable decision trail."
      />
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Units</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Why selected</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <b>{o.code}</b>
                  <small>
                    {new Date(o.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </td>
                <td>{o.customerName}</td>
                <td>{o.itemCount}</td>
                <td>
                  <button
                    onClick={() => o.warehouseCode && onOpen(o.warehouseCode)}
                    className="font-black text-[#1262e3]"
                  >
                    {o.warehouseCode ?? 'Allocating'}
                  </button>
                </td>
                <td>
                  <span className={`status ${statusClass(o.status)}`}>
                    {o.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="max-w-[420px] text-xs text-[#68768a]">
                  {o.allocationReason ?? 'Selection in progress'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.orders.length && (
          <Empty text="Checkout from the Shop to create the first live order." />
        )}
      </div>
    </>
  );
}
function InventoryView({
  products,
  query,
  onMap,
}: {
  products: Product[];
  query: string;
  onMap: (c: string) => void;
}) {
  const rows = products.flatMap((p) => p.locations.map((l) => ({ p, l })));
  return (
    <>
      <PageHead
        eyebrow="Location-addressed stock"
        title={query ? `Results for “${query}”` : 'Inventory overview'}
        sub={`${rows.length} live bin assignments across the StockUp network.`}
      />
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU / barcode</th>
              <th>Exact location</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, l }) => (
              <tr key={l.inventoryId}>
                <td>
                  <b>{p.name}</b>
                  <small>{p.category}</small>
                </td>
                <td>
                  <b>{p.sku}</b>
                  <small>{p.barcode}</small>
                </td>
                <td>
                  <b>{l.locationCode}</b>
                  <small>
                    {l.warehouseCode} · {l.rowCode} · {l.binCode}
                  </small>
                </td>
                <td>{l.onHand}</td>
                <td>{l.reserved}</td>
                <td>
                  <b
                    className={
                      l.available <= 10 ? 'text-[#d35353]' : 'text-[#23884e]'
                    }
                  >
                    {l.available}
                  </b>
                </td>
                <td>
                  <button
                    onClick={() => onMap(l.warehouseCode)}
                    className="rounded-lg border px-3 py-2 text-xs font-black text-[#1262e3]"
                  >
                    Show on map
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty text="No products or physical locations match this search." />
        )}
      </div>
    </>
  );
}

function WorkerView({
  task,
  busy,
  onStart,
  onConfirm,
  onMissing,
}: {
  task?: PickTask;
  busy: boolean;
  onStart: (id: string) => void;
  onConfirm: (id: string, b: string) => void;
  onMissing: (id: string) => void;
}) {
  const next = task?.items.find((i) => i.status !== 'PICKED'),
    picked = task?.items.filter((i) => i.status === 'PICKED').length ?? 0,
    [barcode, setBarcode] = useState('');
  useEffect(() => setBarcode(''), [next?.id]);
  if (!task)
    return (
      <>
        <PageHead
          eyebrow="Employee · EMP-1042"
          title="Worker picking"
          sub="Mobile-first verified picking and dynamic rerouting."
        />
        <Empty text="No active pick task. Create an order from the Shop first." />
      </>
    );
  return (
    <>
      <PageHead
        eyebrow="Employee · EMP-1042"
        title={`${task.code} · ${task.orderCode}`}
        sub={`${picked} / ${task.items.length} picked · ${Math.round(task.totalDistance)} m optimized route`}
        action={
          <span className={`status ${statusClass(task.status)}`}>
            {task.status}
          </span>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="overflow-hidden rounded-2xl border bg-[#edf3f7]">
          <div className="border-b bg-white px-5 py-4 text-sm font-bold">
            Live pick route · check-in → all stops → check-in
          </div>
          <div className="warehouse-canvas">
            <svg viewBox="0 0 820 620" className="h-full w-full">
              <rect
                x="24"
                y="22"
                width="772"
                height="572"
                rx="18"
                fill="#f7fafc"
                stroke="#aebbc9"
                strokeWidth="3"
              />
              {[80, 185, 290, 395].map((y, r) => (
                <g key={y}>
                  <rect
                    x="115"
                    y={y}
                    width="595"
                    height="52"
                    rx="5"
                    fill="#263956"
                  />
                  <text
                    x="80"
                    y={y + 31}
                    textAnchor="middle"
                    className="row-label"
                  >
                    R0{r + 1}
                  </text>
                </g>
              ))}
              <polyline
                points={task.route.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#1473e6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="60"
                cy="520"
                r="14"
                fill="#12213f"
                stroke="white"
                strokeWidth="5"
              />
              {task.items.map((i, index) => (
                <g key={i.id}>
                  <circle
                    cx={i.x + 37}
                    cy={i.y + 21}
                    r={next?.id === i.id ? 16 : 12}
                    fill={
                      i.status === 'PICKED'
                        ? '#7ed957'
                        : next?.id === i.id
                          ? '#f59e0b'
                          : '#fff'
                    }
                    stroke="#12213f"
                    strokeWidth="4"
                  />
                  <text
                    x={i.x + 37}
                    y={i.y + 26}
                    textAnchor="middle"
                    fontWeight="900"
                    fontSize="12"
                  >
                    {i.status === 'PICKED' ? '✓' : index + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
        <aside>
          {task.status === 'ASSIGNED' ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1262e3]">
                Task ready · {task.items.length} stops
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Start at warehouse check-in
              </h2>
              <p className="mt-2 text-sm text-[#68768a]">
                Starting attributes the task to EMP-1042 and activates the first
                destination.
              </p>
              <button
                disabled={busy}
                onClick={() => onStart(task.id)}
                className="mt-5 h-12 w-full rounded-xl bg-[#1262e3] font-black text-white disabled:opacity-40"
              >
                Start picking
              </button>
            </div>
          ) : next ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1262e3]">
                Next pick · Stop {next.sequence}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {next.productName} ×{next.quantity}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f2f6fa] p-4">
                  <p className="text-xs font-bold uppercase text-[#8793a4]">
                    Row
                  </p>
                  <p className="text-2xl font-black">{next.rowCode}</p>
                </div>
                <div className="rounded-xl bg-[#f2f6fa] p-4">
                  <p className="text-xs font-bold uppercase text-[#8793a4]">
                    Bin
                  </p>
                  <p className="text-2xl font-black">{next.binCode}</p>
                </div>
              </div>
              {next.status === 'REROUTED' && (
                <div className="mt-4 rounded-lg border border-[#f4d59d] bg-[#fff8e8] p-3 text-sm font-bold text-[#956310]">
                  Alternative stock found · route recalculated
                </div>
              )}
              <label className="mt-5 block text-xs font-bold uppercase text-[#788598]">
                Scan or enter barcode
              </label>
              <input
                autoComplete="off"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={next.barcode}
                className="mt-2 h-12 w-full rounded-xl border px-4 font-mono text-sm outline-none focus:border-[#1262e3]"
              />
              <button
                disabled={busy || !barcode}
                onClick={() => onConfirm(next.id, barcode)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1262e3] font-black text-white disabled:opacity-40"
              >
                <Check size={18} />
                Confirm verified pick
              </button>
              <button
                disabled={busy}
                onClick={() => onMissing(next.id)}
                className="mt-2 h-11 w-full rounded-xl border border-[#e1a9a9] font-bold text-[#ad3939]"
              >
                Item not found
              </button>
              <p className="mt-3 text-center text-xs text-[#8490a1]">
                Expected: {next.barcode}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#bde6cb] bg-[#effaf3] p-7 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#39ad68] text-white">
                <Check />
              </div>
              <h2 className="mt-4 text-2xl font-black">Pick complete</h2>
              <p className="mt-2 text-sm text-[#557061]">
                Inventory committed and order moved to dispatch.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
function MovementsView({ data }: { data: AppState }) {
  return (
    <>
      <PageHead
        eyebrow="Immutable audit trail"
        title="Stock movements"
        sub="Every quantity change is attributable to a reference, employee, order, and timestamp."
      />
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Movement</th>
              <th>Product</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Location</th>
              <th>Employee</th>
              <th>Order</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.map((m) => (
              <tr key={m.id}>
                <td>
                  <b className="font-mono text-xs">{m.id.slice(0, 15)}</b>
                </td>
                <td>
                  <b>{m.productName}</b>
                </td>
                <td>
                  <span
                    className={`status ${m.movementType === 'OUTWARD' ? 'warn' : 'ok'}`}
                  >
                    {m.movementType}
                  </span>
                </td>
                <td>{m.quantity}</td>
                <td>{m.locationCode ?? '—'}</td>
                <td>{m.employeeCode ?? 'System'}</td>
                <td>{m.orderCode ?? '—'}</td>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function IntelligenceView({
  data,
  busy,
  onSimulation,
  onTransfer,
}: {
  data: AppState;
  busy: boolean;
  onSimulation: () => void;
  onTransfer: (
    sourceInventoryId: string,
    destinationLocationCode: string,
    quantity: number,
  ) => void;
}) {
  const recommendations = data.products.slice(0, 4).map((product) => {
    const events = data.movements.filter(
      (movement) => movement.productName === product.name,
    ).length;
    const source = [...product.locations].sort(
      (a, b) =>
        Math.hypot(b.x - 60, b.y - 520) - Math.hypot(a.x - 60, a.y - 520),
    )[0];
    const target = data.products
      .flatMap((candidate) => candidate.locations)
      .filter(
        (location) =>
          location.warehouseCode === source?.warehouseCode &&
          !product.locations.some((own) => own.binId === location.binId),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - 60, a.y - 520) - Math.hypot(b.x - 60, b.y - 520),
      )[0];
    const currentDistance = source
      ? Math.hypot(source.x - 60, source.y - 520)
      : 0;
    const targetDistance = target
      ? Math.hypot(target.x - 60, target.y - 520)
      : currentDistance;
    const saving =
      currentDistance > 0
        ? Math.max(0, Math.round((1 - targetDistance / currentDistance) * 100))
        : 0;
    return { product, events, source, target, saving };
  });
  const low = data.products
    .flatMap((product) =>
      product.locations
        .filter((location) => location.available <= 10)
        .map((location) => {
          const demand = data.movements
            .filter(
              (movement) =>
                movement.productName === product.name &&
                movement.movementType === 'OUTWARD',
            )
            .reduce((sum, movement) => sum + movement.quantity, 0);
          return {
            product,
            location,
            demand,
            minutes: demand
              ? Math.round((location.available / demand) * 60)
              : null,
          };
        }),
    )
    .slice(0, 5);
  return (
    <>
      <PageHead
        eyebrow="Deterministic intelligence"
        title="Operational recommendations"
        sub="Every recommendation below is calculated from inventory, movements, and physical coordinates."
        action={
          <button
            disabled={busy}
            onClick={onSimulation}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#12213f] px-4 text-sm font-black text-white disabled:opacity-40"
          >
            <CircleGauge size={16} />
            Simulate 25-order surge
          </button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#eaf2ff] text-[#1262e3]">
              <Route />
            </div>
            <div>
              <h2 className="font-black">Adaptive Slotting</h2>
              <p className="text-sm text-[#748095]">
                Measured travel reduction to a nearer bin
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recommendations.map(
              ({ product, events, source, target, saving }) => (
                <div key={product.id} className="rounded-xl border p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{product.name}</b>
                      <p className="mt-1 text-xs text-[#7c8798]">
                        {events} ledger events · {source?.available ?? 0}{' '}
                        available
                      </p>
                    </div>
                    <span className="status blue">-{saving}% travel</span>
                  </div>
                  {source && target && (
                    <>
                      <p className="mt-3 text-sm">
                        <b>Recommend:</b> {source.locationCode} →{' '}
                        {target.locationCode}
                      </p>
                      <button
                        disabled={busy || source.available < 1}
                        onClick={() =>
                          onTransfer(
                            source.inventoryId,
                            target.locationCode,
                            Math.min(5, source.available),
                          )
                        }
                        className="mt-3 rounded-lg border border-[#b9cce5] px-3 py-2 text-xs font-black text-[#1262e3] disabled:opacity-40"
                      >
                        Transfer {Math.min(5, source.available)} units
                      </button>
                    </>
                  )}
                </div>
              ),
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#fff2dd] text-[#c47809]">
              <AlertTriangle />
            </div>
            <div>
              <h2 className="font-black">Stockout Risk</h2>
              <p className="text-sm text-[#748095]">
                Available stock ÷ recorded outward demand
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {low.map(({ product, location, demand, minutes }) => (
              <div
                key={location.inventoryId}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div>
                  <b>{product.name}</b>
                  <p className="mt-1 text-xs text-[#7c8798]">
                    {location.locationCode} · {location.available} available ·{' '}
                    {demand} outward
                  </p>
                </div>
                <div className="text-right">
                  <span className="status warn">
                    {minutes === null ? 'LOW' : 'CRITICAL'}
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {minutes === null
                      ? 'Awaiting demand history'
                      : '~' + minutes + ' min'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-[#12213f] p-6 text-white lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-white/10 text-[#a8ee80]">
              <Lightbulb />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#9fb1cb]">
                Co-purchase intelligence
              </p>
              <h2 className="mt-1 text-xl font-black">
                No fabricated affinity score
              </h2>
              <p className="mt-1 text-sm text-[#b9c8dc]">
                Run the order surge or complete customer baskets to build real
                order-item history before displaying support and confidence.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="m-5 rounded-xl border border-dashed bg-[#f8fafc] p-10 text-center text-sm text-[#748095]">
      {text}
    </div>
  );
}
