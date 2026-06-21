import { useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/format';
import NumberFlow from '@number-flow/react'

export default function PortfolioSummary({ totalValue, rendaFixaTotal, rendaVariavelTotal, investedThisYear, isLoading, error, xirr }) {
  const [isHidden, setIsHidden] = useState(false);

  if (error) {
    return (
      <div className="mb-6 p-4 border-2 border-red-500/30 bg-red-500/10">
        <p className="text-red-400 text-sm">Erro ao calcular portfólio: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 border-2 border-zinc-800">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-zinc-500 text-sm mb-1">Patrimônio total</p>
            <button onClick={() => setIsHidden(!isHidden)} className="text-zinc-500 hover:text-zinc-300 mb-1 text-sm">
              {isHidden ? '⍉' : '⌾'}
            </button>
          </div>
          {(<p className="text-3xl font-semibold text-zinc-100">
            <NumberFlow value={isHidden ? null : totalValue} format={{ style: 'currency', currency: 'BRL' }} />
            </p>
          )}

            <p className="text-zinc-500 text-sm mt-1">
          <NumberFlow value={isHidden ? 0 : investedThisYear} format={{ style: 'currency', currency: 'BRL' }} suffix={` em ${new Date().getFullYear()}`} />
            </p>
        </div>

        <div className="text-right">
          <p className="text-zinc-500 text-sm mb-1">Rentabilidade</p>
          {isLoading ? (
            <div className="h-6 w-24 bg-zinc-800 animate-pulse" />
          ) : (
            <p className={`text-xl font-medium text-green-400`}>
              {formatPercent(xirr * 100)} a.a.
            </p>
          )}
        </div>
      </div>

      {totalValue > 0 && (
        <div className="mt-4">
          <div className="h-3 w-full bg-zinc-800 overflow-hidden flex">
            {rendaVariavelTotal > 0 && (
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${(rendaVariavelTotal / totalValue) * 100}%` }}
              />
            )}
            {rendaFixaTotal > 0 && (
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(rendaFixaTotal / totalValue) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Variável {((rendaVariavelTotal / totalValue) * 100).toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Fixa {((rendaFixaTotal / totalValue) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
