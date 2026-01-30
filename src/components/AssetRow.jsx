import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

const palette = {
  'acao': 'bg-pink-500',
  'etf': 'bg-fuchsia-500',
  'cdb': 'bg-emerald-500',
  'lci': 'bg-green-500',
  'lca': 'bg-lime-600',
  'tesouro_selic': 'bg-yellow-600',
  'tesouro_ipca': 'bg-amber-500',
  'tesouro_prefixado': 'bg-orange-500',
}

export default function AssetRow({ asset, assetValue, onEdit, onDelete }) {
  const formatName = (asset) => {
    if (asset.type === "acao" || asset.type === "etf") {
      return asset.ticker;
    }
    if (asset.type === "cdb" || asset.type === "lci" || asset.type === "lca") {
      const rateDisplay =
        asset.rateType === "prefixado"
          ? `${asset.rate}% a.a.`
          : `${asset.rate}% CDI`;
      return `${asset.type.toUpperCase()} ${asset.bank} ${rateDisplay}`;
    }
    if (asset.type?.startsWith("tesouro_")) {
      const typeLabels = {
        tesouro_selic: "Tesouro Selic",
        tesouro_ipca: "Tesouro IPCA+",
        tesouro_prefixado: "Tesouro Prefixado",
      };
      const label = typeLabels[asset.type] || asset.type.toUpperCase();
      const rateDisplay = asset.rate ? ` ${asset.rate}%` : "";
      return `${label}${rateDisplay}`;
    }
    return `${asset.type.toUpperCase()} ${asset.bank}`;
  };

  const formatValue = (asset) => {
    if (asset.type === "acao" || asset.type === "etf") {
      return `${asset.quantity} @ ${formatCurrency(asset.avgPrice)}`;
    }
    return formatCurrency(asset.amount);
  };

  return (
    <tr className="text-zinc-400 text-sm">
      <td className="text-zinc-500">{formatDate(asset.buyDate)}</td>
      <td className="">
        <span className={`${palette[asset.type]} text-black h-full`}>
          {formatName(asset)}
        </span>
      </td>
      <td className="">{formatValue(asset)}</td>
      <td className="">
        {assetValue ? formatCurrency(assetValue.currentValue) : "-"}
      </td>
      <td
      >
        <span
          className={`${assetValue?.profitPercent >= 0 ? "bg-green-400" : "bg-red-400"} text-black border-y`}
        >
          {assetValue ? formatPercent(assetValue.profitPercent) : "-"}
        </span>
      </td>
      <td className="">
        {asset.maturityDate ? formatDate(asset.maturityDate) : "-"}
      </td>
      <td className="">
        <button
          onClick={() => onEdit(asset)}
          className="hover:text-blue-400 transition-colors"
          aria-label="Editar"
        >
          ✎
        </button>
      </td>
      <td className="px-2">
        <button
          onClick={() => onDelete(asset.id)}
          className="hover:text-red-500 transition-colors"
          aria-label="Excluir"
        >
          ×
        </button>
      </td>
    </tr >
  );
}
