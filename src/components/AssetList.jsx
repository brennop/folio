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
    if (asset.type?.startsWith('tesouro_')) {
      const typeLabels = {
        tesouro_selic: 'Tesouro Selic',
        tesouro_ipca: 'Tesouro IPCA+',
        tesouro_prefixado: 'Tesouro Prefixado',
      };
      const label = typeLabels[asset.type] || asset.type.toUpperCase();
      const rateDisplay = asset.rate ? ` ${asset.rate}%` : '';
      return `${label}${rateDisplay}: R$${asset.amount}${dateSuffix}`;
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
          className="flex items-center justify-between p-3 border-1 border-zinc-600"
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
              ✎
            </button>
            <button
              onClick={() => onDelete(asset.id)}
              className="hover:text-red-500 transition-colors"
              aria-label="Excluir"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
