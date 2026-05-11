import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Geist_Mono } from "next/font/google";
import { getAllAssets } from "@/lib/db";
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

export default function StocksPage() {
  const [assets, setAssets] = useState([]);
  const [contribution, setContribution] = useState("");
  const [companyCount, setCompanyCount] = useState("");
  const { assetValues, isLoading, error } = usePortfolioValue(assets);

  useEffect(() => {
    getAllAssets().then(setAssets);
  }, []);

  const stockRows = useMemo(() => {
    return assets
      .filter((asset) => asset.type === "acao")
      .map((asset) => {
        const value = assetValues[asset.id];
        return {
          id: asset.id,
          ticker: asset.ticker,
          quantity: Number(asset.quantity) || 0,
          currentValue: Number(value?.currentValue) || 0,
          pricePerShare: value?.pricePerShare,
          hasQuote: Number(value?.pricePerShare) > 0,
        };
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [assets, assetValues]);

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
            <h1 className="text-2xl font-semibold">Equilíbrio de ações</h1>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <div>Valor atual em ações</div>
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
            Máximo de empresas
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
            Algumas ações estão sem cotação atual e foram excluídas das recomendações de compra.
          </div>
        )}

        {stockRows.length === 0 && !isLoading ? (
          <div className="flex flex-1 items-center justify-center border border-zinc-900 text-zinc-500">
            Nenhuma ação cadastrada. Esta página considera apenas ativos do tipo ação.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="sticky top-0 bg-black">
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="p-2">Ticker</th>
                  <th className="p-2 text-right">Qtd.</th>
                  <th className="p-2 text-right">Preço</th>
                  <th className="p-2 text-right">Atual</th>
                  <th className="p-2 text-right">Atual %</th>
                  <th className="p-2 text-right">Comprar</th>
                  <th className="p-2 text-right">Aporte</th>
                  <th className="p-2 text-right">Projetado</th>
                  <th className="p-2 text-right">Projetado %</th>
                </tr>
              </thead>
              <tbody>
                {rebalance.rows.map((stock) => {
                  const currentPercent =
                    currentTotal > 0 ? (stock.currentValue / currentTotal) * 100 : 0;
                  return (
                    <tr key={stock.id} className="border-b border-zinc-900 text-zinc-300">
                      <td className="p-2">
                        <span className="bg-pink-400 px-1 text-black">{stock.ticker}</span>
                      </td>
                      <td className="p-2 text-right text-zinc-400">{stock.quantity}</td>
                      <td className="p-2 text-right">
                        {stock.hasQuote ? formatCurrency(stock.pricePerShare) : "-"}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(stock.currentValue)}</td>
                      <td className="p-2 text-right">{formatPercentValue(currentPercent)}</td>
                      <td className="p-2 text-right">
                        {stock.recommendedShares > 0 ? (
                          <span className="bg-emerald-400 px-1 text-black">
                            {stock.recommendedShares}
                          </span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(stock.recommendedAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(stock.projectedValue)}</td>
                      <td className="p-2 text-right">
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
                O aporte informado não compra uma ação inteira das empresas elegíveis.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
