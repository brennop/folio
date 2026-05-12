import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Geist_Mono } from "next/font/google";
import {
  deleteStockTarget,
  getAllAssets,
  getAllStockTargets,
  upsertStockTarget,
} from "@/lib/db";
import { calculateStockRebalance } from "@/lib/rebalance";
import { formatCurrency } from "@/lib/format";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function formatPercentValue(value) {
  return `${value.toFixed(2)}%`;
}

const tickerColorClasses = [
  "bg-teal-400",
  "bg-cyan-400",
  "bg-sky-400",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-purple-400",
  "bg-fuchsia-400",
  "bg-pink-400",
  "bg-rose-400",
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-400",
  "bg-emerald-400",
];

export default function StocksPage() {
  const [assets, setAssets] = useState([]);
  const [stockTargets, setStockTargets] = useState({});
  const [contribution, setContribution] = useState("");
  const [companyCount, setCompanyCount] = useState("");
  const { assetValues, isLoading, error } = usePortfolioValue(assets);

  useEffect(() => {
    Promise.all([getAllAssets(), getAllStockTargets()]).then(([nextAssets, targets]) => {
      setAssets(nextAssets);
      setStockTargets(
        Object.fromEntries(
          targets.map((target) => [target.ticker, String(target.targetPercentage)])
        )
      );
    });
  }, []);

  const stockRows = useMemo(() => {
    const rowsByTicker = assets
      .filter((asset) => asset.type === "acao" || asset.type === "etf")
      .reduce((rows, asset) => {
        const ticker = String(asset.ticker || "").toUpperCase();
        if (!ticker) return rows;

        const value = assetValues[asset.id];
        const pricePerShare = Number(value?.pricePerShare) > 0 ? value.pricePerShare : null;
        const row = rows[ticker] ?? {
          id: ticker,
          ticker,
          quantity: 0,
          currentValue: 0,
          pricePerShare,
          hasQuote: false,
          targetPercentage: Number(stockTargets[ticker]) || 0,
          targetPercentageInput: stockTargets[ticker] ?? "",
        };

        row.quantity += Number(asset.quantity) || 0;
        row.currentValue += Number(value?.currentValue) || 0;
        if (pricePerShare) {
          row.pricePerShare = pricePerShare;
          row.hasQuote = true;
        }

        rows[ticker] = row;
        return rows;
      }, {});

    return Object.values(rowsByTicker).sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [assets, assetValues, stockTargets]);

  const eligibleCount = stockRows.filter((stock) => stock.hasQuote).length;
  const effectiveCompanyCount = Math.min(
    Math.max(1, Math.floor(Number(companyCount) || eligibleCount || 1)),
    Math.max(eligibleCount, 1)
  );
  const contributionValue = Math.max(0, Number(contribution) || 0);
  const currentTotal = stockRows.reduce((sum, stock) => sum + stock.currentValue, 0);
  const hasMissingQuotes = stockRows.some((stock) => !stock.hasQuote);

  const rebalance = useMemo(() => {
    return calculateStockRebalance(stockRows, contributionValue, effectiveCompanyCount);
  }, [stockRows, contributionValue, effectiveCompanyCount]);

  useEffect(() => {
    if (!companyCount && eligibleCount > 0) {
      setCompanyCount(String(eligibleCount));
    }
  }, [companyCount, eligibleCount]);

  const handleCompanyCountChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === "") {
      setCompanyCount("");
      return;
    }

    const parsed = Math.floor(Number(nextValue));
    if (!Number.isFinite(parsed)) return;
    setCompanyCount(String(Math.min(Math.max(parsed, 1), Math.max(eligibleCount, 1))));
  };

  const handleContributionChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === "") {
      setContribution("");
      return;
    }

    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) return;
    setContribution(String(Math.max(parsed, 0)));
  };

  const handleTargetChange = async (ticker, value) => {
    if (value === "") {
      setStockTargets((prev) => {
        const nextTargets = { ...prev };
        delete nextTargets[ticker];
        return nextTargets;
      });
      await deleteStockTarget(ticker);
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const normalizedValue = String(Math.max(parsed, 0));
    setStockTargets((prev) => ({ ...prev, [ticker]: normalizedValue }));
    await upsertStockTarget({
      ticker,
      targetPercentage: Number(normalizedValue),
    });
  };

  return (
    <div className={`${geistMono.className} min-h-screen bg-black text-zinc-100`}>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-2 inline-block text-sm text-zinc-500 transition-colors hover:text-zinc-200"
            >
              ← Folio
            </Link>
            <h1 className="text-2xl font-semibold">Equilíbrio de ações e ETFs</h1>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <div>Valor atual em ações e ETFs</div>
            <div className="text-lg text-zinc-100">{formatCurrency(currentTotal)}</div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm text-zinc-400">
            Aporte em BRL
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={contribution}
              onChange={handleContributionChange}
              placeholder="0.00"
              className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2 text-zinc-100 outline-none transition-colors focus:border-zinc-500"
            />
          </label>
          <label className="text-sm text-zinc-400">
            Máximo de ativos
            <input
              type="number"
              min="1"
              max={Math.max(eligibleCount, 1)}
              step="1"
              value={companyCount}
              onChange={handleCompanyCountChange}
              disabled={eligibleCount === 0}
              className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2 text-zinc-100 outline-none transition-colors focus:border-zinc-500 disabled:text-zinc-600"
            />
          </label>
          <div className="flex flex-col justify-end text-sm text-zinc-400">
            <span>Alocado: {formatCurrency(rebalance.totalAllocated)}</span>
            <span>Sobra: {formatCurrency(rebalance.unallocatedCash)}</span>
          </div>
        </section>

        {error && (
          <div className="mb-4 border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            Erro ao carregar cotações: {error}
          </div>
        )}

        {hasMissingQuotes && (
          <div className="mb-4 border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-200">
            Alguns ativos estão sem cotação atual e foram excluídos das recomendações de compra.
          </div>
        )}

        {stockRows.length === 0 && !isLoading ? (
          <div className="flex flex-1 items-center justify-center border border-zinc-900 text-zinc-500">
            Nenhuma ação ou ETF cadastrado. Esta página considera apenas ações e ETFs.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead className="sticky top-0 bg-black">
                <tr className="border-b border-zinc-700 text-left text-zinc-400">
                  <th className="p-1">Ticker</th>
                  <th className="p-1 text-right">Qtd.</th>
                  <th className="p-1 text-right">Preço</th>
                  <th className="p-1 text-right">Atual</th>
                  <th className="p-1 text-right">Atual %</th>
                  <th className="p-1 text-right">Desejado %</th>
                  <th className="p-1 text-right">Comprar</th>
                  <th className="p-1 text-right">Aporte</th>
                  <th className="p-1 text-right">Projetado</th>
                  <th className="p-1 text-right">Projetado %</th>
                </tr>
              </thead>
              <tbody>
                {rebalance.rows.map((stock, index) => {
                  const currentPercent =
                    currentTotal > 0 ? (stock.currentValue / currentTotal) * 100 : 0;
                  const tickerColorClass =
                    tickerColorClasses[index % tickerColorClasses.length];
                  return (
                    <tr key={stock.id} className="text-zinc-400">
                      <td>
                        <span className={`${tickerColorClass} px-1 text-black`}>
                          {stock.ticker}
                        </span>
                      </td>
                      <td className="text-right">{stock.quantity}</td>
                      <td className="text-right">
                        {stock.hasQuote ? formatCurrency(stock.pricePerShare) : "-"}
                      </td>
                      <td className="text-right">{formatCurrency(stock.currentValue)}</td>
                      <td className="text-right">{formatPercentValue(currentPercent)}</td>
                      <td className="text-right text-xs">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stock.targetPercentageInput}
                          onChange={(event) =>
                            handleTargetChange(stock.ticker, event.target.value)
                          }
                          placeholder="0"
                          className="w-20 border border-zinc-700 bg-zinc-800 text-xs pl-2 text-zinc-100 outline-none transition-colors focus:border-zinc-500"
                          aria-label={`Percentual desejado de ${stock.ticker}`}
                        />
                      </td>
                      <td className="text-right">
                        {stock.recommendedShares > 0 ? (
                          <span className="bg-emerald-400 px-1 text-black">
                            {stock.recommendedShares}
                          </span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="text-right">{formatCurrency(stock.recommendedAmount)}</td>
                      <td className="text-right">{formatCurrency(stock.projectedValue)}</td>
                      <td className="text-right">
                        {formatPercentValue(stock.projectedPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLoading && (
              <div className="mt-4 text-sm text-zinc-500">Carregando valores atuais...</div>
            )}
            {stockRows.length > 0 && contributionValue > 0 && rebalance.totalAllocated === 0 && (
              <div className="mt-4 text-sm text-zinc-500">
                O aporte informado não compra uma unidade inteira dos ativos elegíveis.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
