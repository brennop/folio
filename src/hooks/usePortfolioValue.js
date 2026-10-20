import { useState, useEffect, useCallback, useMemo } from 'react';
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

// Resolves to `fallback` instead of rejecting, so one failing upstream (e.g. BCB) doesn't break the whole portfolio
async function fetchJson(url, options, fallback) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return fallback;
  }
}

function getInvested(asset) {
  if (asset.type === 'acao' || asset.type === 'etf') return asset.quantity * asset.avgPrice;
  return asset.amount || 0;
}

export function usePortfolioValue(assets) {
  const [state, setState] = useLocalStorage('v1', {
    profit: 0,
    profitPercent: 0,
    assetValues: {},
    rendaFixaTotal: 0,
    rendaVariavelTotal: 0,
    investedThisYear: 0,
    indices: null,
    isLoading: true,
    error: null,
  });

  const calculateValues = useCallback(async () => {
    if (!assets || assets.length === 0) {
      setState({
        totalValue: 0,
        totalInvested: 0,
        profit: 0,
        profitPercent: 0,
        assetValues: {},
        rendaFixaTotal: 0,
        rendaVariavelTotal: 0,
        investedThisYear: 0,
        indices: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get stock tickers
      const stockAssets = assets.filter((a) => a.type === 'acao' || a.type === 'etf');
      const tickers = stockAssets.map((a) => a.ticker);

      // Index series must cover the oldest position, since we compound from each buy date
      const startDate = assets.map((a) => a.buyDate).filter(Boolean).sort()[0] ?? '2024-01-01';

      // Fetch data in parallel
      const [quotes, indices, series] = await Promise.all([
        tickers.length > 0
          ? fetchJson('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers }),
          }, {})
          : Promise.resolve({}),
        fetchJson('/api/indices', undefined, null),
        fetchJson(`/api/bcb-series?startDate=${startDate}`, undefined, null),
      ]);

      let totalValue = 0;
      let totalInvested = 0;
      let rendaFixaTotal = 0;
      let rendaVariavelTotal = 0;
      let investedThisYear = 0;
      const currentYear = new Date().getFullYear();
      const assetValues = {};

      const rendaVariavelTypes = ['acao', 'etf'];
      const rendaFixaTypes = ['cdb', 'lci', 'lca', 'tesouro_selic', 'tesouro_ipca', 'tesouro_prefixado'];

      for (const asset of assets) {
        let result;
        const invested = getInvested(asset);

        // Fallback to invested amount when market data is unavailable
        const unavailable = {
          currentValue: invested,
          invested,
          profit: 0,
          profitPercent: 0,
          dailyChange: null,
          pricePerShare: null,
        };

        try {
          switch (asset.type) {
            case 'acao':
            case 'etf': {
              const quote = quotes[asset.ticker];
              if (quote && !quote.error) {
                result = {
                  ...calculateEquity(asset.quantity, asset.avgPrice, quote.price),
                  dailyChange: quote.change ?? null,
                  pricePerShare: quote.price,
                };
              } else {
                result = unavailable;
              }
              break;
            }

            case 'cdb':
              if (asset.rateType === 'prefixado') {
                result = calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate);
              } else {
                result = calculateCdiLinked(
                  asset.amount,
                  asset.buyDate,
                  asset.rate,
                  series?.data?.cdi,
                  false
                );
              }
              break;

            case 'lci':
            case 'lca':
              if (asset.rateType === 'prefixado') {
                result = calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate, true);
              } else {
                result = calculateCdiLinked(
                  asset.amount,
                  asset.buyDate,
                  asset.rate,
                  series?.data?.cdi,
                  true // tax-free
                );
              }
              break;

            case 'tesouro_selic':
              result = calculateTesouroSelic(asset.amount, asset.buyDate, series?.data?.selic);
              break;

            case 'tesouro_ipca':
              result = calculateTesouroIpca(
                { principal: asset.amount,
                  buyDate: asset.buyDate,
                  spread: asset.rate || 6, // Default spread if not specified
                  ipca: series?.data?.ipca
                }
              );
              break;

            case 'tesouro_prefixado':
              result = calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate);
              break;

            default:
              result = { currentValue: 0, profit: 0, profitPercent: 0 };
          }
        } catch (error) {
          console.error(`Failed to calculate asset ${asset.id} (${asset.type}):`, error);
          result = unavailable;
        }

        assetValues[asset.id] = {
          ...result,
          invested,
          buyDate: asset.buyDate
        };

        const currentValue = result.currentValue || 0;
        totalValue += currentValue;
        totalInvested += invested;

        if (rendaVariavelTypes.includes(asset.type)) {
          rendaVariavelTotal += currentValue;
        } else if (rendaFixaTypes.includes(asset.type)) {
          rendaFixaTotal += currentValue;
        }

        if (asset.buyDate) {
          const buyYear = parseDate(asset.buyDate).getFullYear();
          if (buyYear === currentYear) {
            investedThisYear += invested;
          }
        }
      }

      const profit = totalValue - totalInvested;
      const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

      setState({
        totalValue,
        totalInvested,
        profit,
        profitPercent,
        assetValues,
        rendaFixaTotal,
        rendaVariavelTotal,
        investedThisYear,
        indices,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to calculate portfolio value:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  }, [assets]);

  useEffect(() => {
    calculateValues();
  }, [calculateValues]);

  const xirrRate = useMemo(() => {
    const transactions = Object.values(state.assetValues).flatMap(asset => {
      return [
        { amount: -asset.invested, when: parseDate(asset.buyDate) },
        { amount: asset.currentValue, when: new Date() },
      ]
    })

    if (transactions.length < 2) return 0

    return xirr(transactions)
  }, [state.assetValues]);

  return { xirr: xirrRate, ...state };
}
