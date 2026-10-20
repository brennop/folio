import { useState, useEffect } from 'react';
import { Link } from '@/router';
import { fetchAssets } from '@/lib/assets';
import AssetViews from '@/components/AssetViews';
import PortfolioSummary from '@/components/PortfolioSummary';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';

export default function Home() {
  const [assets, setAssets] = useState([]);
  const { totalValue, profit, profitPercent, assetValues, rendaFixaTotal, rendaVariavelTotal, investedThisYear, indices, isLoading, error, xirr } = usePortfolioValue(assets);

  useEffect(() => {
    fetchAssets().then(setAssets);
  }, []);

  return (
    <div
      className={`font-mono flex min-h-screen items-center justify-center bg-black`}
    >
      <main className="flex h-screen w-full max-w-4xl flex-col bg-black py-8 px-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Folio
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/stocks"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Ações
            </Link>
          </div>
        </header>

        <PortfolioSummary
          totalValue={totalValue}
          profit={profit}
          profitPercent={profitPercent}
          rendaFixaTotal={rendaFixaTotal}
          rendaVariavelTotal={rendaVariavelTotal}
          investedThisYear={investedThisYear}
          isLoading={isLoading}
          xirr={xirr}
          error={error}
        />

        <AssetViews
          assets={assets}
          assetValues={assetValues}
          indices={indices}
        />
      </main>
    </div>
  );
}
