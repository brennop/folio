import { useState, useEffect, useCallback } from 'react';
import {
  calculateCdiLinked,
  calculateTesouroSelic,
  calculateTesouroIpca,
  calculateTesouroPrefixado,
  calculateEquity,
} from '@/lib/calculations';

export function usePortfolioValue(assets) {
  const [state, setState] = useState({
    totalValue: 0,
    totalInvested: 0,
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

      // Fetch data in parallel
      const [quotesResponse, indicesResponse] = await Promise.all([
        tickers.length > 0
          ? fetch('/api/quotes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tickers }),
            }).then((r) => r.json())
          : Promise.resolve({}),
        fetch('/api/indices').then((r) => r.json()),
      ]);

      const quotes = quotesResponse;
      const indices = indicesResponse;

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
        let invested = 0;

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
              invested = asset.quantity * asset.avgPrice;
            } else {
              // Fallback to average price if quote unavailable
              result = {
                currentValue: asset.quantity * asset.avgPrice,
                invested: asset.quantity * asset.avgPrice,
                profit: 0,
                profitPercent: 0,
                dailyChange: null,
                pricePerShare: null,
              };
              invested = asset.quantity * asset.avgPrice;
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
                indices.cdi.annual,
                false
              );
            }
            invested = asset.amount;
            break;

          case 'lci':
          case 'lca':
            result = calculateCdiLinked(
              asset.amount,
              asset.buyDate,
              asset.rate,
              indices.cdi.annual,
              true // tax-free
            );
            invested = asset.amount;
            break;

          case 'tesouro_selic':
            result = calculateTesouroSelic(asset.amount, asset.buyDate, indices.selic);
            invested = asset.amount;
            break;

          case 'tesouro_ipca':
            result = calculateTesouroIpca(
              asset.amount,
              asset.buyDate,
              asset.rate || 6, // Default spread if not specified
              indices.ipca
            );
            invested = asset.amount;
            break;

          case 'tesouro_prefixado':
            result = calculateTesouroPrefixado(asset.amount, asset.buyDate, asset.rate);
            invested = asset.amount;
            break;

          default:
            result = { currentValue: 0, profit: 0, profitPercent: 0 };
            invested = 0;
        }

        assetValues[asset.id] = {
          ...result,
          invested,
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
          const buyYear = new Date(asset.buyDate).getFullYear();
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

  return state;
}
