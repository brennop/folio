export function calculateStockRebalance(stocks, contribution, maxCompanies) {
  const normalizedContribution = Math.max(0, Number(contribution) || 0);
  const eligibleStocks = stocks.filter(
    (stock) => Number(stock.pricePerShare) > 0 && Number(stock.currentValue) >= 0
  );
  const targetTotal = eligibleStocks.reduce(
    (sum, stock) => sum + Math.max(0, Number(stock.targetPercentage) || 0),
    0
  );
  const useEqualWeights = targetTotal <= 0;
  const targetWeights = Object.fromEntries(
    eligibleStocks.map((stock) => [
      stock.id,
      useEqualWeights
        ? 1 / eligibleStocks.length
        : Math.max(0, Number(stock.targetPercentage) || 0) / targetTotal,
    ])
  );
  const companyLimit = Math.max(
    0,
    Math.min(Math.floor(Number(maxCompanies) || 0), eligibleStocks.length)
  );
  const purchases = Object.fromEntries(
    stocks.map((stock) => [
      stock.id,
      {
        shares: 0,
        amount: 0,
      },
    ])
  );
  const projectedValues = Object.fromEntries(
    stocks.map((stock) => [stock.id, Number(stock.currentValue) || 0])
  );
  const currentTotal = stocks.reduce((sum, stock) => sum + (Number(stock.currentValue) || 0), 0);
  const selectedIds = new Set();
  let totalAllocated = 0;
  let unallocatedCash = normalizedContribution;

  while (companyLimit > 0) {
    const affordable = eligibleStocks
      .filter((stock) => {
        if (unallocatedCash < stock.pricePerShare) return false;
        if ((targetWeights[stock.id] || 0) <= 0) return false;
        return selectedIds.has(stock.id) || selectedIds.size < companyLimit;
      })
      .sort((a, b) => {
        const projectedTotalA = currentTotal + totalAllocated + a.pricePerShare;
        const projectedTotalB = currentTotal + totalAllocated + b.pricePerShare;
        const aDeficit =
          projectedTotalA * (targetWeights[a.id] || 0) -
          (projectedValues[a.id] + a.pricePerShare);
        const bDeficit =
          projectedTotalB * (targetWeights[b.id] || 0) -
          (projectedValues[b.id] + b.pricePerShare);
        const deficitDiff = bDeficit - aDeficit;
        if (deficitDiff !== 0) return deficitDiff;
        return a.pricePerShare - b.pricePerShare;
      });

    const nextStock = affordable[0];
    if (!nextStock) break;

    selectedIds.add(nextStock.id);
    purchases[nextStock.id].shares += 1;
    purchases[nextStock.id].amount += nextStock.pricePerShare;
    projectedValues[nextStock.id] += nextStock.pricePerShare;
    totalAllocated += nextStock.pricePerShare;
    unallocatedCash -= nextStock.pricePerShare;
  }

  const projectedTotal = currentTotal + totalAllocated;

  return {
    rows: stocks.map((stock) => ({
      ...stock,
      normalizedTargetPercent: (targetWeights[stock.id] || 0) * 100,
      recommendedShares: purchases[stock.id]?.shares || 0,
      recommendedAmount: purchases[stock.id]?.amount || 0,
      projectedValue: projectedValues[stock.id] || 0,
      projectedPercent:
        projectedTotal > 0 ? ((projectedValues[stock.id] || 0) / projectedTotal) * 100 : 0,
    })),
    totalAllocated,
    unallocatedCash,
    projectedTotal,
  };
}
