export default function AssetList({ assets, onDelete }) {
  if (assets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Nenhum ativo cadastrado
      </div>
    );
  }

  const formatAsset = (asset) => {
    if (asset.type === 'acao' || asset.type === 'etf') {
      return `${asset.ticker}: ${asset.quantity} @ R$${asset.avgPrice}`;
    }
    return `${asset.type.toUpperCase()} ${asset.bank}: R$${asset.amount}`;
  };

  return (
    <ul className="flex-1 overflow-y-auto space-y-2">
      {assets.map((asset) => (
        <li
          key={asset.id}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900"
        >
          <span className="text-zinc-800 dark:text-zinc-200">
            {formatAsset(asset)}
          </span>
          <button
            onClick={() => onDelete(asset.id)}
            className="text-zinc-400 hover:text-red-500 transition-colors"
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
        </li>
      ))}
    </ul>
  );
}
