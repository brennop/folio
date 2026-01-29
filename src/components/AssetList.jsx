export default function AssetList({ assets, assetValues = {}, onDelete, onEdit }) {
  if (assets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Nenhum ativo cadastrado
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatAsset = (asset) => {
    const date = formatDate(asset.buyDate);
    const dateSuffix = date ? ` (${date})` : '';

    if (asset.type === 'acao' || asset.type === 'etf') {
      return `${asset.ticker}: ${asset.quantity} @ R$${asset.avgPrice}${dateSuffix}`;
    }
    if (asset.type === 'cdb' || asset.type === 'lci' || asset.type === 'lca') {
      const rateDisplay = asset.rateType === 'prefixado'
        ? `${asset.rate}% a.a.`
        : `${asset.rate}% CDI`;
      return `${asset.type.toUpperCase()} ${asset.bank}: R$${asset.amount} ${rateDisplay}${dateSuffix}`;
    }
    return `${asset.type.toUpperCase()} ${asset.bank}: R$${asset.amount}${dateSuffix}`;
  };

  const formatProfit = (value) => {
    if (value === undefined || value === null) return null;
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <ul className="flex-1 overflow-y-auto space-y-2">
      {assets.map((asset) => (
        <li
          key={asset.id}
          className="flex items-center justify-between p-3 border-2"
        >
          <div className="flex-1">
            <span>{formatAsset(asset)}</span>
            {assetValues[asset.id] && (
              <div className="flex gap-4 text-sm mt-1">
                <span className="text-zinc-400">
                  {formatCurrency(assetValues[asset.id].currentValue)}
                </span>
                <span className={assetValues[asset.id].profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatProfit(assetValues[asset.id].profitPercent)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(asset)}
              className="hover:text-blue-400 transition-colors"
              aria-label="Editar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(asset.id)}
              className="hover:text-red-500 transition-colors"
              aria-label="Excluir"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
