export type OrderItemRecord = {
  orderId: string;
  productId: string;
  productName: string;
};

export type CoPurchaseAffinity = {
  productAId: string;
  productAName: string;
  productBId: string;
  productBName: string;
  coOccurrenceCount: number;
  support: number;
  confidenceAtoB: number;
  confidenceBtoA: number;
  recommendation: string;
};

export function computeCoPurchaseMatrix(
  orderItems: OrderItemRecord[],
  totalOrdersCount: number
): CoPurchaseAffinity[] {
  if (!orderItems.length || totalOrdersCount <= 0) return [];

  const ordersMap = new Map<string, Array<{ id: string; name: string }>>();
  const productCountMap = new Map<string, number>();

  orderItems.forEach((item) => {
    productCountMap.set(item.productId, (productCountMap.get(item.productId) ?? 0) + 1);

    if (!ordersMap.has(item.orderId)) {
      ordersMap.set(item.orderId, []);
    }
    const current = ordersMap.get(item.orderId)!;
    if (!current.some((p) => p.id === item.productId)) {
      current.push({ id: item.productId, name: item.productName });
    }
  });

  const pairCountMap = new Map<string, {
    count: number;
    pA: { id: string; name: string };
    pB: { id: string; name: string };
  }>();

  for (const items of ordersMap.values()) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [a, b] = [items[i], items[j]].sort((x, y) => x.id.localeCompare(y.id));
        const key = `${a.id}:${b.id}`;

        if (!pairCountMap.has(key)) {
          pairCountMap.set(key, { count: 0, pA: a, pB: b });
        }
        pairCountMap.get(key)!.count += 1;
      }
    }
  }

  const results: CoPurchaseAffinity[] = [];

  for (const { count, pA, pB } of pairCountMap.values()) {
    const countA = productCountMap.get(pA.id) ?? 1;
    const countB = productCountMap.get(pB.id) ?? 1;

    const support = Math.round((count / totalOrdersCount) * 1000) / 1000;
    const confidenceAtoB = Math.round((count / countA) * 100);
    const confidenceBtoA = Math.round((count / countB) * 100);

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
      recommendation,
    });
  }

  return results.sort((x, y) => y.coOccurrenceCount - x.coOccurrenceCount);
}
