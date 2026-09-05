'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Boxes,
  Check,
  Download,
  History,
  MapPinned,
  PackageOpen,
  PackagePlus,
  Plus,
  RefreshCcw,
  SearchX,
  SlidersHorizontal,
  TrendingDown,
  Warehouse,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  Movement,
  Product,
  Warehouse as WarehouseType,
} from '@/lib/types';

type Location = Product['locations'][number];
type InventoryRow = { product: Product; location: Location };
type NewItem = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  pricePaise: number;
  reorderPoint: number;
  locationCode: string;
  openingStock: number;
};

export default function InventoryWorkspace({
  products,
  warehouses,
  movements,
  query,
  busy,
  onMap,
  onRefresh,
  onCreateItem,
  onAdjust,
  onTransfer,
}: {
  products: Product[];
  warehouses: WarehouseType[];
  movements: Movement[];
  query: string;
  busy: boolean;
  onMap: (warehouseCode: string) => void;
  onRefresh: () => Promise<void> | void;
  onCreateItem: (item: NewItem) => Promise<void>;
  onAdjust: (
    inventoryId: string,
    delta: number,
    reason: string,
  ) => Promise<void>;
  onTransfer: (
    inventoryId: string,
    destinationLocationCode: string,
    quantity: number,
  ) => Promise<void>;
}) {
  const allRows = useMemo(
    () =>
      products.flatMap((product) =>
        product.locations.map((location) => ({ product, location })),
      ),
    [products],
  );
  const locationOptions = useMemo(
    () =>
      Array.from(
        new Map(
          allRows.map((row) => [row.location.locationCode, row.location]),
        ).values(),
      ),
    [allRows],
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );
  const [health, setHealth] = useState<'all' | 'healthy' | 'low' | 'out'>(
    'all',
  );
  const [warehouse, setWarehouse] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'name' | 'available' | 'value'>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewItem>({
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    pricePaise: 10000,
    reorderPoint: 10,
    locationCode: locationOptions[0]?.locationCode ?? '',
    openingStock: 25,
  });
  const [adjustment, setAdjustment] = useState({
    delta: 1,
    reason: 'Cycle count correction',
  });
  const [transfer, setTransfer] = useState({
    destinationLocationCode: '',
    quantity: 1,
  });

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = allRows.filter(({ product, location }) => {
      if (
        normalizedQuery &&
        ![
          product.name,
          product.sku,
          product.barcode,
          product.category,
          location.warehouseCode,
          location.locationCode,
          location.rowCode,
          location.binCode,
        ].some((value) => value.toLowerCase().includes(normalizedQuery))
      )
        return false;
      const reorder = product.reorderPoint ?? 10;
      if (warehouse !== 'all' && location.warehouseCode !== warehouse)
        return false;
      if (category !== 'all' && product.category !== category) return false;
      if (health === 'healthy' && location.available <= reorder) return false;
      if (
        health === 'low' &&
        (location.available <= 0 || location.available > reorder)
      )
        return false;
      if (health === 'out' && location.available !== 0) return false;
      return true;
    });
    return result.sort((a, b) => {
      if (sort === 'available')
        return b.location.available - a.location.available;
      if (sort === 'value')
        return (
          b.location.onHand * b.product.pricePaise -
          a.location.onHand * a.product.pricePaise
        );
      return a.product.name.localeCompare(b.product.name);
    });
  }, [allRows, category, health, query, sort, warehouse]);

  const selected =
    allRows.find((row) => row.location.inventoryId === selectedId) ?? null;
  const totalOnHand = allRows.reduce(
    (sum, row) => sum + row.location.onHand,
    0,
  );
  const totalReserved = allRows.reduce(
    (sum, row) => sum + row.location.reserved,
    0,
  );
  const lowCount = allRows.filter(
    (row) => row.location.available <= (row.product.reorderPoint ?? 10),
  ).length;
  const stockValue = allRows.reduce(
    (sum, row) => sum + row.location.onHand * row.product.pricePaise,
    0,
  );

  const exportCsv = () => {
    const csv = [
      [
        'Product',
        'SKU',
        'Barcode',
        'Warehouse',
        'Location',
        'On hand',
        'Reserved',
        'Available',
      ],
      ...filteredRows.map(({ product, location }) => [
        product.name,
        product.sku,
        product.barcode,
        location.warehouseCode,
        location.locationCode,
        location.onHand,
        location.reserved,
        location.available,
      ]),
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stockup-inventory.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openAdjust = (row: InventoryRow) => {
    setSelectedId(row.location.inventoryId);
    setAdjustment({ delta: 1, reason: 'Cycle count correction' });
    setAdjustOpen(true);
  };
  const openTransfer = (row: InventoryRow) => {
    const destination = locationOptions.find(
      (location) =>
        location.warehouseCode === row.location.warehouseCode &&
        location.locationCode !== row.location.locationCode,
    );
    setSelectedId(row.location.inventoryId);
    setTransfer({
      destinationLocationCode: destination?.locationCode ?? '',
      quantity: 1,
    });
    setTransferOpen(true);
  };

  return (
    <section className="inventory-shell">
      <div className="inventory-hero">
        <div>
          <p className="inventory-kicker">Inventory command</p>
          <h1>
            {query ? `Items matching “${query}”` : 'Items & stock locations'}
          </h1>
          <p>
            Live warehouse quantities, exact bins, reservations, valuation, and
            audit-safe actions.
          </p>
        </div>
        <div className="inventory-actions">
          <button
            onClick={() => void onRefresh()}
            className="inventory-button secondary"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={exportCsv} className="inventory-button secondary">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="inventory-button primary"
          >
            <Plus size={17} /> New item
          </button>
        </div>
      </div>

      <div className="inventory-metrics">
        <Metric
          icon={<Boxes />}
          label="On-hand units"
          value={totalOnHand.toLocaleString('en-IN')}
          note={`${allRows.length} physical locations`}
          tone="blue"
        />
        <Metric
          icon={<PackageOpen />}
          label="Available to promise"
          value={(totalOnHand - totalReserved).toLocaleString('en-IN')}
          note={`${totalReserved} units reserved`}
          tone="cyan"
        />
        <Metric
          icon={<TrendingDown />}
          label="Low-stock bins"
          value={lowCount.toString()}
          note="At or below reorder point"
          tone="amber"
        />
        <Metric
          icon={<Warehouse />}
          label="Stock value"
          value={money(stockValue)}
          note={`${warehouses.length} fulfilment centres`}
          tone="navy"
        />
      </div>

      <div className="inventory-workbench">
        <aside className="inventory-filterbar">
          <div className="filter-title">
            <SlidersHorizontal size={16} /> Filters
          </div>
          <FilterGroup
            title="Stock status"
            value={health}
            onChange={(value) => setHealth(value as typeof health)}
            options={[
              ['all', 'All items', allRows.length],
              ['healthy', 'Healthy', allRows.length - lowCount],
              [
                'low',
                'Low stock',
                allRows.filter(
                  (row) =>
                    row.location.available > 0 &&
                    row.location.available <= (row.product.reorderPoint ?? 10),
                ).length,
              ],
              [
                'out',
                'Out of stock',
                allRows.filter((row) => row.location.available === 0).length,
              ],
            ]}
          />
          <FilterGroup
            title="Warehouse"
            value={warehouse}
            onChange={setWarehouse}
            options={[
              ['all', 'All warehouses', allRows.length],
              ...warehouses.map(
                (item) =>
                  [
                    item.code,
                    item.code,
                    allRows.filter(
                      (row) => row.location.warehouseCode === item.code,
                    ).length,
                  ] as [string, string, number],
              ),
            ]}
          />
          <div className="filter-section">
            <p>Category</p>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </aside>

        <div className="inventory-list-panel">
          <div className="inventory-list-toolbar">
            <div>
              <b>{filteredRows.length} stock locations</b>
              <span>
                {checked.length
                  ? `${checked.length} selected`
                  : 'Select an item to inspect every bin detail'}
              </span>
            </div>
            <label>
              Sort{' '}
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="name">Item name</option>
                <option value="available">Available stock</option>
                <option value="value">Stock value</option>
              </select>
            </label>
          </div>
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Select all visible inventory"
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 &&
                        filteredRows.every((row) =>
                          checked.includes(row.location.inventoryId),
                        )
                      }
                      onChange={(event) =>
                        setChecked(
                          event.target.checked
                            ? filteredRows.map(
                                (row) => row.location.inventoryId,
                              )
                            : [],
                        )
                      }
                    />
                  </th>
                  <th>Item details</th>
                  <th>Warehouse & bin</th>
                  <th>On hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Health</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const reorder = row.product.reorderPoint ?? 10;
                  const tone =
                    row.location.available === 0
                      ? 'out'
                      : row.location.available <= reorder
                        ? 'low'
                        : 'healthy';
                  return (
                    <tr
                      key={row.location.inventoryId}
                      className={
                        selectedId === row.location.inventoryId
                          ? 'selected'
                          : ''
                      }
                    >
                      <td>
                        <input
                          aria-label={`Select ${row.product.name} at ${row.location.locationCode}`}
                          type="checkbox"
                          checked={checked.includes(row.location.inventoryId)}
                          onChange={(event) =>
                            setChecked((current) =>
                              event.target.checked
                                ? [...current, row.location.inventoryId]
                                : current.filter(
                                    (id) => id !== row.location.inventoryId,
                                  ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="item-cell"
                          aria-label={`Inspect ${row.product.name} at ${row.location.locationCode}`}
                          onClick={() =>
                            setSelectedId(row.location.inventoryId)
                          }
                        >
                          <span>{initials(row.product.name)}</span>
                          <div>
                            <b>{row.product.name}</b>
                            <small>
                              {row.product.category} · {row.product.sku}
                              <br />
                              Barcode {row.product.barcode}
                            </small>
                          </div>
                        </button>
                      </td>
                      <td>
                        <button
                          aria-label={`Open ${row.location.warehouseCode} warehouse map at ${row.location.locationCode}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMap(row.location.warehouseCode);
                          }}
                        >
                          <b>{row.location.locationCode}</b>
                          <small>
                            {row.location.warehouseCode} ·{' '}
                            {row.location.rowCode} · {row.location.binCode}
                          </small>
                        </button>
                      </td>
                      <td className="number">{row.location.onHand}</td>
                      <td className="number reserved">
                        {row.location.reserved}
                      </td>
                      <td className="number available">
                        {row.location.available}
                      </td>
                      <td>
                        <span className={`inventory-health ${tone}`}>
                          {tone === 'healthy'
                            ? 'In stock'
                            : tone === 'low'
                              ? 'Low stock'
                              : 'Out of stock'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label={`Adjust ${row.product.name}`}
                            title="Adjust stock"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAdjust(row);
                            }}
                          >
                            <ArrowUpDown size={15} />
                          </button>
                          <button
                            aria-label={`Transfer ${row.product.name}`}
                            title="Transfer stock"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTransfer(row);
                            }}
                          >
                            <ArrowLeftRight size={15} />
                          </button>
                          <button
                            aria-label={`Show ${row.product.name} on map`}
                            title="Show on map"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMap(row.location.warehouseCode);
                            }}
                          >
                            <MapPinned size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredRows.length && (
              <div className="inventory-empty">
                <SearchX />
                <b>No stock locations match these filters</b>
                <span>
                  Clear a filter or search another SKU, barcode, or bin.
                </span>
              </div>
            )}
          </div>
        </div>

        <aside className="inventory-inspector">
          {selected ? (
            <>
              <div className="inspector-head">
                <span>{initials(selected.product.name)}</span>
                <div>
                  <p>{selected.product.category}</p>
                  <h2>{selected.product.name}</h2>
                </div>
              </div>
              <dl>
                <div>
                  <dt>SKU</dt>
                  <dd>{selected.product.sku}</dd>
                </div>
                <div>
                  <dt>Barcode</dt>
                  <dd>{selected.product.barcode}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selected.location.locationCode}</dd>
                </div>
                <div>
                  <dt>Unit price</dt>
                  <dd>{money(selected.product.pricePaise)}</dd>
                </div>
              </dl>
              <div className="inspector-stock">
                <div>
                  <span>On hand</span>
                  <b>{selected.location.onHand}</b>
                </div>
                <div>
                  <span>Reserved</span>
                  <b>{selected.location.reserved}</b>
                </div>
                <div>
                  <span>Available</span>
                  <b>{selected.location.available}</b>
                </div>
              </div>
              <div className="inspector-actions">
                <button onClick={() => onMap(selected.location.warehouseCode)}>
                  <MapPinned size={16} /> Show on warehouse map
                </button>
                <button onClick={() => openAdjust(selected)}>
                  <ArrowUpDown size={16} /> Adjust stock
                </button>
                <button onClick={() => openTransfer(selected)}>
                  <ArrowLeftRight size={16} /> Transfer stock
                </button>
              </div>
              <div className="movement-preview">
                <p>
                  <History size={15} /> Recent ledger activity
                </p>
                {movements
                  .filter(
                    (movement) =>
                      movement.productName === selected.product.name,
                  )
                  .slice(0, 3)
                  .map((movement) => (
                    <div key={movement.id}>
                      <span
                        className={`movement-dot ${movement.movementType.toLowerCase()}`}
                      />
                      <div>
                        <b>
                          {movement.movementType} · {movement.quantity}
                        </b>
                        <small>
                          {new Date(movement.createdAt).toLocaleString()} ·{' '}
                          {movement.employeeCode ?? 'System'}
                        </small>
                      </div>
                    </div>
                  ))}
                {!movements.some(
                  (movement) => movement.productName === selected.product.name,
                ) && <small>No recent stock-changing activity.</small>}
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <PackageOpen />
              <b>Choose a stock location</b>
              <span>
                View exact bin inventory and perform controlled actions.
              </span>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Create inventory item
            </DialogTitle>
            <DialogDescription>
              Add a real SKU to an existing warehouse bin. Opening stock creates
              an INWARD ledger movement.
            </DialogDescription>
          </DialogHeader>
          <form
            id="new-item-form"
            className="inventory-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await onCreateItem(newItem);
              setNewOpen(false);
            }}
          >
            <label>
              Item name
              <input
                required
                value={newItem.name}
                onChange={(event) =>
                  setNewItem({ ...newItem, name: event.target.value })
                }
              />
            </label>
            <label>
              Category
              <input
                required
                value={newItem.category}
                onChange={(event) =>
                  setNewItem({ ...newItem, category: event.target.value })
                }
              />
            </label>
            <label>
              SKU
              <input
                required
                value={newItem.sku}
                onChange={(event) =>
                  setNewItem({
                    ...newItem,
                    sku: event.target.value.toUpperCase(),
                  })
                }
              />
            </label>
            <label>
              Barcode
              <input
                required
                value={newItem.barcode}
                onChange={(event) =>
                  setNewItem({ ...newItem, barcode: event.target.value })
                }
              />
            </label>
            <label>
              Unit price (₹)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={newItem.pricePaise / 100}
                onChange={(event) =>
                  setNewItem({
                    ...newItem,
                    pricePaise: Math.round(Number(event.target.value) * 100),
                  })
                }
              />
            </label>
            <label>
              Reorder point
              <input
                required
                min="0"
                type="number"
                value={newItem.reorderPoint}
                onChange={(event) =>
                  setNewItem({
                    ...newItem,
                    reorderPoint: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="wide">
              Opening location
              <select
                required
                value={newItem.locationCode}
                onChange={(event) =>
                  setNewItem({ ...newItem, locationCode: event.target.value })
                }
              >
                {locationOptions.map((location) => (
                  <option key={location.locationCode}>
                    {location.locationCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              Opening stock
              <input
                required
                min="1"
                type="number"
                value={newItem.openingStock}
                onChange={(event) =>
                  setNewItem({
                    ...newItem,
                    openingStock: Number(event.target.value),
                  })
                }
              />
            </label>
          </form>
          <DialogFooter>
            <button
              disabled={busy}
              form="new-item-form"
              className="inventory-button primary"
            >
              <PackagePlus size={16} /> Create item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Adjust stock
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.product.name} · ${selected.location.locationCode}`
                : 'Select a stock location.'}
            </DialogDescription>
          </DialogHeader>
          <form
            id="adjust-form"
            className="inventory-form one"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!selected) return;
              await onAdjust(
                selected.location.inventoryId,
                adjustment.delta,
                adjustment.reason,
              );
              setAdjustOpen(false);
            }}
          >
            <label>
              Quantity change
              <input
                required
                type="number"
                value={adjustment.delta}
                onChange={(event) =>
                  setAdjustment({
                    ...adjustment,
                    delta: Number(event.target.value),
                  })
                }
              />
              <small>Use a negative number to reduce stock.</small>
            </label>
            <label>
              Reason
              <input
                required
                value={adjustment.reason}
                onChange={(event) =>
                  setAdjustment({ ...adjustment, reason: event.target.value })
                }
              />
            </label>
          </form>
          <DialogFooter>
            <button
              disabled={busy || adjustment.delta === 0}
              form="adjust-form"
              className="inventory-button primary"
            >
              <Check size={16} /> Commit adjustment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Transfer stock
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.product.name} from ${selected.location.locationCode}`
                : 'Select a stock location.'}
            </DialogDescription>
          </DialogHeader>
          <form
            id="transfer-form"
            className="inventory-form one"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!selected) return;
              await onTransfer(
                selected.location.inventoryId,
                transfer.destinationLocationCode,
                transfer.quantity,
              );
              setTransferOpen(false);
            }}
          >
            <label>
              Destination bin
              <select
                required
                value={transfer.destinationLocationCode}
                onChange={(event) =>
                  setTransfer({
                    ...transfer,
                    destinationLocationCode: event.target.value,
                  })
                }
              >
                <option value="">Choose destination</option>
                {locationOptions
                  .filter(
                    (location) =>
                      selected &&
                      location.warehouseCode ===
                        selected.location.warehouseCode &&
                      location.locationCode !== selected.location.locationCode,
                  )
                  .map((location) => (
                    <option key={location.locationCode}>
                      {location.locationCode}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                required
                min="1"
                max={selected?.location.available ?? 1}
                type="number"
                value={transfer.quantity}
                onChange={(event) =>
                  setTransfer({
                    ...transfer,
                    quantity: Number(event.target.value),
                  })
                }
              />
            </label>
          </form>
          <DialogFooter>
            <button
              disabled={busy || !transfer.destinationLocationCode}
              form="transfer-form"
              className="inventory-button primary"
            >
              <ArrowLeftRight size={16} /> Create transfer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="inventory-metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <b>{value}</b>
        <span>{note}</span>
      </div>
    </article>
  );
}

function FilterGroup({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string, number]>;
}) {
  return (
    <div className="filter-section">
      <p>{title}</p>
      {options.map(([key, label, count]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={value === key ? 'active' : ''}
        >
          <span>
            {value === key && <Check size={13} />}
            {label}
          </span>
          <b>{count}</b>
        </button>
      ))}
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
