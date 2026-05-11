export function calculateStockRebalance(stocks, contribution, maxCompanies) {
  const normalizedContribution = Math.max(0, Number(contribution) || 0);
  const eligibleStocks = stocks.filter(
    (stock) => Number(stock.pricePerShare) > 0 && Number(stock.currentValue) >= 0
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
  const selectedIds = new Set();
  let unallocatedCash = normalizedContribution;

  while (companyLimit > 0) {
    const affordable = eligibleStocks
      .filter((stock) => {
        if (unallocatedCash < stock.pricePerShare) return false;
        return selectedIds.has(stock.id) || selectedIds.size < companyLimit;
      })
      .sort((a, b) => {
        const valueDiff = projectedValues[a.id] - projectedValues[b.id];
        if (valueDiff !== 0) return valueDiff;
        return a.pricePerShare - b.pricePerShare;
      });

    const nextStock = affordable[0];
    if (!nextStock) break;

    selectedIds.add(nextStock.id);
    purchases[nextStock.id].shares += 1;
    purchases[nextStock.id].amount += nextStock.pricePerShare;
    projectedValues[nextStock.id] += nextStock.pricePerShare;
    unallocatedCash -= nextStock.pricePerShare;
  }

  const totalAllocated = normalizedContribution - unallocatedCash;
  const projectedTotal =
    stocks.reduce((sum, stock) => sum + (Number(stock.currentValue) || 0), 0) +
    totalAllocated;

  return {
    rows: stocks.map((stock) => ({
      ...stock,
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
