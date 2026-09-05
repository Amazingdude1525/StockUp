export type SplitCandidateItem = {
  productId: string;
  requested: number;
  available: number;
};

export type SplitCandidateWarehouse = {
  id: string;
  code: string;
  loadPercent: number;
  items: SplitCandidateItem[];
};

export type SplitAllocationResult = {
  isSplit: boolean;
  warehousesUsed: number;
  allocations: Array<{
    warehouseId: string;
    warehouseCode: string;
    items: Array<{ productId: string; quantity: number }>;
  }>;
  unfulfilledItems: Array<{ productId: string; quantity: number }>;
  reason: string;
};

export function computeSplitFulfilment(
  candidates: SplitCandidateWarehouse[],
  requestedItems: Array<{ productId: string; quantity: number }>
): SplitAllocationResult {
  const remaining = new Map<string, number>(
    requestedItems.map((item) => [item.productId, item.quantity])
  );

  const warehouseAssignments: Array<{
    warehouseId: string;
    warehouseCode: string;
    items: Array<{ productId: string; quantity: number }>;
  }> = [];

  const availableCandidates = [...candidates].sort((a, b) => a.loadPercent - b.loadPercent);

  for (const candidate of availableCandidates) {
    const assignedForThisWh: Array<{ productId: string; quantity: number }> = [];

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
        items: assignedForThisWh,
      });
    }

    const allFulfilled = [...remaining.values()].every((rem) => rem === 0);
    if (allFulfilled) break;
  }

  const unfulfilled: Array<{ productId: string; quantity: number }> = [];
  for (const [productId, rem] of remaining.entries()) {
    if (rem > 0) {
      unfulfilled.push({ productId, quantity: rem });
    }
  }

  const isSplit = warehouseAssignments.length > 1;
  const reasonParts = warehouseAssignments.map(
    (wh) => `${wh.warehouseCode}: ${wh.items.map((i) => `SKU ${i.productId.slice(-4)} ×${i.quantity}`).join(', ')}`
  );

  const reason = isSplit
    ? `Split fulfilment required across ${warehouseAssignments.length} warehouses (${reasonParts.join(' | ')})`
    : warehouseAssignments.length === 1
      ? `Full order fulfilled by ${warehouseAssignments[0].warehouseCode}`
      : 'Insufficient inventory across network';

  return {
    isSplit,
    warehousesUsed: warehouseAssignments.length,
    allocations: warehouseAssignments,
    unfulfilledItems: unfulfilled,
    reason,
  };
}
