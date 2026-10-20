// Income tax brackets (IR regressivo)
// <= 180 days: 22.5%
// 181-360 days: 20%
// 361-720 days: 17.5%
// > 720 days: 15%

import { parseDate } from '@/lib/format';

export function getDaysHeld(buyDate) {
  const buy = parseDate(buyDate);
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

const noChange = (principal) => ({ currentValue: principal, grossValue: principal, profit: 0, profitPercent: 0 });

// Compounds a BCB daily series ({ data: 'DD/MM/YYYY', valor: '% a.d.' }) from buyDate (YYYY-MM-DD) on.
// The rate fixed on day D accrues D→D+1, so the buy day counts and today's (unpublished) rate doesn't.
// `multiplier` scales each daily rate, e.g. 1.1 for 110% of CDI (B3 convention).
export function accumulateDaily(series, buyDate, multiplier = 1) {
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error('Daily index series is missing or empty');
  }

  return series.reduce((factor, { data, valor }) => {
    const [d, m, y] = data.split('/');
    if (`${y}-${m}-${d}` < buyDate) return factor;
    return factor * (1 + (parseFloat(valor) / 100) * multiplier);
  }, 1);
}

function applyTax(principal, grossValue, days, isTaxFree = false) {
  const grossProfit = grossValue - principal;
  const taxRate = isTaxFree ? 0 : getIncomeTaxRate(days);
  const netProfit = grossProfit - grossProfit * taxRate;

  return {
    currentValue: principal + netProfit,
    grossValue,
    profit: netProfit,
    profitPercent: (netProfit / principal) * 100,
  };
}

export function calculateCdiLinked(principal, buyDate, cdiPercentage, cdiSeries, isTaxFree = false) {
  if (!buyDate || cdiPercentage === undefined || cdiPercentage === null) return noChange(principal);

  const days = getDaysHeld(buyDate);
  if (days <= 0) return noChange(principal);

  const grossValue = principal * accumulateDaily(cdiSeries, buyDate, cdiPercentage / 100);
  return applyTax(principal, grossValue, days, isTaxFree);
}

export function calculateTesouroSelic(principal, buyDate, selicSeries) {
  const days = getDaysHeld(buyDate);
  if (days <= 0) return noChange(principal);

  const grossValue = principal * accumulateDaily(selicSeries, buyDate);
  return applyTax(principal, grossValue, days);
}

export function calculateTesouroPrefixado(principal, buyDate, annualRate, isTaxFree = false) {
  const days = getDaysHeld(buyDate);
  if (days <= 0) return noChange(principal);

  const grossValue = principal * Math.pow(1 + annualRate / 100, days / 365);
  return applyTax(principal, grossValue, days, isTaxFree);
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
