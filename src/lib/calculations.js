// Income tax brackets (IR regressivo)
// <= 180 days: 22.5%
// 181-360 days: 20%
// 361-720 days: 17.5%
// > 720 days: 15%

export function getDaysHeld(buyDate) {
  const buy = new Date(buyDate);
  const now = new Date();
  const diffTime = now - buy;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getIncomeTaxRate(days) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

export function calculateCdiLinked(principal, buyDate, cdiPercentage, annualCdi, isTaxFree = false) {
  if (!buyDate) {
    return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };
  }

  const days = getDaysHeld(buyDate);
  if (days <= 0) return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };

  // Handle missing rate values
  if (cdiPercentage === undefined || cdiPercentage === null || annualCdi === undefined || annualCdi === null) {
    return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };
  }

  // Convert CDI percentage (e.g., 110 for 110% CDI) to decimal
  const rate = (cdiPercentage / 100) * (annualCdi / 100);

  // Compound interest: P * (1 + r)^(days/365)
  const grossValue = principal * Math.pow(1 + rate, days / 365);
  const grossProfit = grossValue - principal;

  // Apply tax if not tax-free (LCI/LCA)
  const taxRate = isTaxFree ? 0 : getIncomeTaxRate(days);
  const tax = grossProfit * taxRate;
  const netProfit = grossProfit - tax;
  const currentValue = principal + netProfit;

  return {
    currentValue,
    grossValue,
    profit: netProfit,
    profitPercent: (netProfit / principal) * 100,
  };
}

export function calculateTesouroSelic(principal, buyDate, annualSelic) {
  const days = getDaysHeld(buyDate);
  if (days <= 0) return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };

  // Tesouro Selic follows SELIC rate
  const rate = annualSelic / 100;
  const grossValue = principal * Math.pow(1 + rate, days / 365);
  const grossProfit = grossValue - principal;

  const taxRate = getIncomeTaxRate(days);
  const tax = grossProfit * taxRate;
  const netProfit = grossProfit - tax;
  const currentValue = principal + netProfit;

  return {
    currentValue,
    grossValue,
    profit: netProfit,
    profitPercent: (netProfit / principal) * 100,
  };
}

export function calculateTesouroIpca(principal, buyDate, spread, annualIpca) {
  const days = getDaysHeld(buyDate);
  if (days <= 0) return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };

  // Tesouro IPCA+ = IPCA + spread (e.g., IPCA + 6%)
  const rate = (annualIpca + spread) / 100;
  const grossValue = principal * Math.pow(1 + rate, days / 365);
  const grossProfit = grossValue - principal;

  const taxRate = getIncomeTaxRate(days);
  const tax = grossProfit * taxRate;
  const netProfit = grossProfit - tax;
  const currentValue = principal + netProfit;

  return {
    currentValue,
    grossValue,
    profit: netProfit,
    profitPercent: (netProfit / principal) * 100,
  };
}

export function calculateTesouroPrefixado(principal, buyDate, annualRate) {
  const days = getDaysHeld(buyDate);
  if (days <= 0) return { currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 };

  const rate = annualRate / 100;
  const grossValue = principal * Math.pow(1 + rate, days / 365);
  const grossProfit = grossValue - principal;

  const taxRate = getIncomeTaxRate(days);
  const tax = grossProfit * taxRate;
  const netProfit = grossProfit - tax;
  const currentValue = principal + netProfit;

  return {
    currentValue,
    grossValue,
    profit: netProfit,
    profitPercent: (netProfit / principal) * 100,
  };
}

export function calculateEquity(quantity, avgPrice, currentPrice) {
  const invested = quantity * avgPrice;
  const currentValue = quantity * currentPrice;
  const profit = currentValue - invested;
  const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;

  return {
    currentValue,
    invested,
    profit,
    profitPercent,
  };
}
