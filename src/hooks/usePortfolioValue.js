import { useState, useEffect, useMemo } from 'react';
import {
  calculateCdiLinked,
  calculateTesouroSelic,
  calculateTesouroPrefixado,
  calculateEquity,
} from '@/lib/calculations';
import {
  calculateTesouroIpca,
} from '@/lib/ipca';
import { parseDate } from '@/lib/format';
import {useLocalStorage} from './useLocalStorage';
import xirr from "xirr";

// /api/bcb-series answers right away and lists series it is still fetching from BCB in `pending`
const SERIES_RETRY_MS = 5000;
const SERIES_MAX_RETRIES = 24; // ~2 min

const rendaVariavelTypes = ['acao', 'etf'];
const rendaFixaTypes = ['cdb', 'lci', 'lca', 'tesouro_selic', 'tesouro_ipca', 'tesouro_prefixado'];

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function getInvested(asset) {
  if (asset.type === 'acao' || asset.type === 'etf') return asset.quantity * asset.avgPrice;
  return asset.amount || 0;
}

// Values one asset, or returns null while the market data it needs hasn't arrived
function valueAsset(asset, quotes, series) {
  switch (asset.type) {
    case 'acao':
    case 'etf': {
      const quote = quotes?.[asset.ticker];
      if (!quote || quote.error) return null;
      return {
        ...calculateEquity(asset.quantity, asset.avgPrice, quote.price),
        dailyChange: quote.change ?? null,
        pricePerShare: quote.price,
      };
    }

    case 'cdb':
    case 'lci':
    case 'lca': {
      const isTaxFree = asset.type !== 'cdb';
      if (asset.rateType === 'prefixado') {
        return calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate, isTaxFree);
      }
      if (!series?.cdi) return null;
      return calculateCdiLinked(asset.amount, asset.buyDate, asset.rate, series.cdi, isTaxFree);
    }

    case 'tesouro_selic':
      if (!series?.selic) return null;
      return calculateTesouroSelic(asset.amount, asset.buyDate, series.selic);

    case 'tesouro_ipca':
      if (!series?.ipca) return null;
      return calculateTesouroIpca({
        principal: asset.amount,
        buyDate: asset.buyDate,
        spread: asset.rate || 6, // Default spread if not specified
        ipca: series.ipca,
      });

    case 'tesouro_prefixado':
      return calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate);

    default:
      return { currentValue: 0, profit: 0, profitPercent: 0 };
  }
}

// Latest rates for display, from the series already fetched
function latestIndices(series) {
  const latest = (rows) => (rows?.length ? parseFloat(rows.at(-1).valor) : null);
  const annualize = (daily) => (daily === null ? null : (Math.pow(1 + daily / 100, 252) - 1) * 100);
  return {
    cdi: { annual: annualize(latest(series?.cdi)) },
    selic: annualize(latest(series?.selic)),
    ipca: latest(series?.ipca),
  };
}

export function usePortfolioValue(assets) {
  const [quotes, setQuotes] = useState(null);
  const [series, setSeries] = useState(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState(null);
  // Last computed value per asset, shown until fresh market data arrives
  const [lastValues, setLastValues] = useLocalStorage('assetValues', {});

  const tickers = useMemo(
    () => [...new Set((assets ?? []).filter((a) => rendaVariavelTypes.includes(a.type)).map((a) => a.ticker))],
    [assets],
  );
  // Index series must cover the oldest position, since we compound from each buy date
  const startDate = useMemo(
    () => (assets ?? []).map((a) => a.buyDate).filter(Boolean).sort()[0] ?? null,
    [assets],
  );

  useEffect(() => {
    if (tickers.length === 0) return;
    let cancelled = false;
    setQuotesLoading(true);
    fetchJson('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
    })
      .then((data) => !cancelled && setQuotes(data))
      .catch((err) => {
        console.error('Failed to fetch quotes:', err);
        if (!cancelled) setError(err.message);
      })
      .finally(() => !cancelled && setQuotesLoading(false));
    return () => { cancelled = true; };
  }, [tickers.join(',')]);

  useEffect(() => {
    if (!startDate) return;
    let cancelled = false;
    let timer;
    setSeriesLoading(true);

    const load = async (attempt) => {
      let pending = true;
      try {
        const res = await fetchJson(`/api/bcb-series?startDate=${startDate}`);
        if (cancelled) return;
        setSeries((prev) => ({ ...prev, ...res.data }));
        pending = res.pending.length > 0;
      } catch (err) {
        console.error('Failed to fetch BCB series:', err);
      }
      if (cancelled) return;
      if (pending && attempt < SERIES_MAX_RETRIES) {
        timer = setTimeout(() => load(attempt + 1), SERIES_RETRY_MS);
      } else {
        setSeriesLoading(false);
      }
    };

    load(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [startDate]);

  const fresh = useMemo(() => {
    const values = {};
    for (const asset of assets ?? []) {
      try {
        const result = valueAsset(asset, quotes, series);
        if (result) values[asset.id] = { ...result, invested: getInvested(asset), buyDate: asset.buyDate };
      } catch (err) {
        console.error(`Failed to calculate asset ${asset.id} (${asset.type}):`, err);
      }
    }
    return values;
  }, [assets, quotes, series]);

  useEffect(() => {
    if (Object.keys(fresh).length > 0) setLastValues((prev) => ({ ...prev, ...fresh }));
  }, [fresh]);

  const summary = useMemo(() => {
    const assetValues = {};
    let totalValue = 0;
    let totalInvested = 0;
    let rendaFixaTotal = 0;
    let rendaVariavelTotal = 0;
    let investedThisYear = 0;
    const currentYear = new Date().getFullYear();

    for (const asset of assets ?? []) {
      const invested = getInvested(asset);
      // Fresh value, else the last known one (marked stale), else the invested amount
      const value = fresh[asset.id]
        ?? (lastValues[asset.id] && { ...lastValues[asset.id], stale: true })
        ?? { currentValue: invested, profit: 0, profitPercent: 0, dailyChange: null, pricePerShare: null, stale: true };
      assetValues[asset.id] = { ...value, invested, buyDate: asset.buyDate };

      const currentValue = value.currentValue || 0;
      totalValue += currentValue;
      totalInvested += invested;
      if (rendaVariavelTypes.includes(asset.type)) rendaVariavelTotal += currentValue;
      else if (rendaFixaTypes.includes(asset.type)) rendaFixaTotal += currentValue;
      if (asset.buyDate && parseDate(asset.buyDate).getFullYear() === currentYear) investedThisYear += invested;
    }

    const profit = totalValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    return { assetValues, totalValue, totalInvested, profit, profitPercent, rendaFixaTotal, rendaVariavelTotal, investedThisYear };
  }, [assets, fresh, lastValues]);

  const indices = useMemo(() => latestIndices(series), [series]);

  const xirrRate = useMemo(() => {
    const transactions = Object.values(summary.assetValues).flatMap(asset => {
      return [
        { amount: -asset.invested, when: parseDate(asset.buyDate) },
        { amount: asset.currentValue, when: new Date() },
      ]
    })

    if (transactions.length < 2) return 0

    try {
      return xirr(transactions)
    } catch {
      return 0
    }
  }, [summary.assetValues]);

  return {
    ...summary,
    indices,
    xirr: xirrRate,
    isLoading: quotesLoading || seriesLoading,
    error,
  };
}
