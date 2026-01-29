export default function PortfolioSummary({ totalValue, profit, profitPercent, isLoading, error }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (error) {
    return (
      <div className="mb-6 p-4 border-2 border-red-500/30 bg-red-500/10">
        <p className="text-red-400 text-sm">Erro ao calcular portfólio: {error}</p>
      </div>
    );
  }

  const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="mb-6 p-4 border-2 border-zinc-800">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-zinc-500 text-sm mb-1">Patrimônio total</p>
          {isLoading ? (
            <div className="h-8 w-32 bg-zinc-800 animate-pulse" />
          ) : (
            <p className="text-3xl font-semibold text-zinc-100">
              {formatCurrency(totalValue)}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-zinc-500 text-sm mb-1">Lucro/Prejuízo</p>
          {isLoading ? (
            <div className="h-6 w-24 bg-zinc-800 animate-pulse" />
          ) : (
            <p className={`text-xl font-medium ${profitColor}`}>
              {formatCurrency(profit)} ({formatPercent(profitPercent)})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
