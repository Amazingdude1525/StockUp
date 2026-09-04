export type Warehouse = {
  id: string;
  code: string;
  name: string;
  city: string;
  status: string;
  loadPercent: number;
  checkinCode: string;
  activeOrders: number;
  lowStock: number;
};
export type Product = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  pricePaise: number;
  locations: Array<{
    inventoryId: string;
    warehouseId: string;
    warehouseCode: string;
    binId: string;
    locationCode: string;
    rowCode: string;
    binCode: string;
    onHand: number;
    reserved: number;
    available: number;
    x: number;
    y: number;
  }>;
};
export type Movement = {
  id: string;
  productName: string;
  movementType: string;
  quantity: number;
  locationCode: string;
  employeeCode: string | null;
  orderCode: string | null;
  createdAt: string;
};
export type PickItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  status: string;
  sequence: number;
  inventoryId: string;
  locationCode: string;
  rowCode: string;
  binCode: string;
  x: number;
  y: number;
};
export type PickTask = {
  id: string;
  code: string;
  orderCode: string;
  status: string;
  employeeCode: string | null;
  totalDistance: number;
  route: Array<{ x: number; y: number }>;
  items: PickItem[];
};
export type AppState = {
  warehouses: Warehouse[];
  products: Product[];
  movements: Movement[];
  tasks: PickTask[];
  orders: Array<{
    id: string;
    code: string;
    status: string;
    warehouseCode: string | null;
    customerName: string;
    totalPaise: number;
    createdAt: string;
    allocationReason: string | null;
    itemCount: number;
  }>;
};

export type StaffSession = {
  token: string;
  staffCode: string;
  displayName: string;
  role: 'PICKER' | 'WAREHOUSE_MANAGER' | 'NETWORK_ADMIN';
  warehouseCode: string | null;
  expiresAt: string;
};
