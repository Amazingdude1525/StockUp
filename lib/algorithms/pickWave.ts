import { warehouseAStarRoute, routeDistance, type Point } from './routing';

export type WaveOrder = {
  orderId: string;
  orderCode: string;
  code?: string;
  warehouseId: string;
  items: Array<{
    itemId: string;
    productId: string;
    productName: string;
    locationCode: string;
    x: number;
    y: number;
    quantity: number;
  }>;
};

export type PickWaveResult = {
  waveCode: string;
  warehouseId: string;
  orderIds: string[];
  orderCodes: string[];
  totalItems: number;
  route: Array<{ x: number; y: number }>;
  naiveDistance: number;
  optimizedDistance: number;
  savingPercentage: number;
  createdAt: string;
};

export function createPickWave(
  orders: WaveOrder[],
  waveSequenceNumber: number
): PickWaveResult | null {
  if (!orders.length) return null;

  const warehouseId = orders[0].warehouseId;
  const sameWarehouseOrders = orders.filter((o) => o.warehouseId === warehouseId);
  if (!sameWarehouseOrders.length) return null;

  const waveCode = `PW-${String(waveSequenceNumber).padStart(4, '0')}`;
  const orderIds = sameWarehouseOrders.map((o) => o.orderId);
  const orderCodes = sameWarehouseOrders.map((o) => o.code || o.orderCode);

  const allStops: Array<Point & { productId: string; quantity: number }> = [];
  sameWarehouseOrders.forEach((order) => {
    order.items.forEach((item, idx) => {
      allStops.push({
        id: `${order.orderId}-${idx}`,
        x: item.x,
        y: item.y,
        productId: item.productId,
        quantity: item.quantity,
      });
    });
  });

  const checkin: Point = { id: 'CP', x: 60, y: 520 };
  const naivePoints = [checkin, ...allStops, checkin];
  const naiveDistance = Math.round(routeDistance(naivePoints) * 0.1);

  const optimizedPath = warehouseAStarRoute(allStops);
  const optimizedDistance = Math.round(routeDistance(optimizedPath) * 0.1);

  const savingPercentage = naiveDistance > 0
    ? Math.max(0, Math.round(((naiveDistance - optimizedDistance) / naiveDistance) * 1000) / 10)
    : 0;

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
    createdAt: new Date().toISOString(),
  };
}
