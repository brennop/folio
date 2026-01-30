import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import Tooltip from "@/components/Tooltip";

const palette = {
  'acao': 'bg-pink-400',
  'etf': 'bg-fuchsia-400',
  'cdb': 'bg-emerald-400',
  'lci': 'bg-green-400',
  'lca': 'bg-lime-400',
  'tesouro_selic': 'bg-yellow-400',
  'tesouro_ipca': 'bg-amber-400',
  'tesouro_prefixado': 'bg-orange-400',
}

export default function AssetRow({ asset, assetValue, indices, onEdit, onDelete }) {
  const formatName = (asset) => {
    if (asset.type === "acao" || asset.type === "etf") {
      return asset.ticker;
    }
    if (asset.type === "cdb" || asset.type === "lci" || asset.type === "lca") {
      return `${asset.type.toUpperCase()} ${asset.bank}`;
    }
    if (asset.type?.startsWith("tesouro_")) {
      const typeLabels = {
        tesouro_selic: "Tesouro Selic",
        tesouro_ipca: "Tesouro IPCA+",
        tesouro_prefixado: "Tesouro Prefixado",
      };
      return typeLabels[asset.type] || asset.type.toUpperCase();
    }
    return `${asset.type.toUpperCase()} ${asset.bank}`;
  };

  const getNameTooltipContent = () => {
    if (asset.type === "acao" || asset.type === "etf") {
      if (assetValue?.pricePerShare != null) {
        const changeDisplay = assetValue.dailyChange != null
          ? ` (${assetValue.dailyChange >= 0 ? "+" : ""}${assetValue.dailyChange.toFixed(2)}%)`
          : "";
        return `${formatCurrency(assetValue.pricePerShare)}${changeDisplay}`;
      }
      return null;
    }

    if (asset.type === "cdb" || asset.type === "lci" || asset.type === "lca") {
      const rate = asset.rateType === "prefixado"
        ? `${asset.rate}% a.a.`
        : `${asset.rate}% CDI`;
      if (asset.rateType !== "prefixado") {
        const cdiRate = indices?.cdi?.annual;
        return cdiRate ? `${rate} (CDI: ${cdiRate.toFixed(2)}%)` : rate;
      }
      return rate;
    }

    if (asset.type === "tesouro_selic") {
      const selicRate = indices?.selic;
      return selicRate ? `SELIC: ${selicRate.toFixed(2)}%` : "SELIC";
    }

    if (asset.type === "tesouro_ipca") {
      const ipcaRate = indices?.ipca;
      return ipcaRate ? `IPCA: ${ipcaRate.toFixed(2)}% + ${asset.rate || 6}%` : `IPCA + ${asset.rate || 6}%`;
    }

    if (asset.type === "tesouro_prefixado") {
      return `${asset.rate}% a.a.`;
    }

    return null;
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
        {getNameTooltipContent() ? (
          <Tooltip content={getNameTooltipContent()}>
            <span className={`${palette[asset.type]} text-black h-full cursor-default`}>
              {formatName(asset)}
            </span>
          </Tooltip>
        ) : (
          <span className={`${palette[asset.type]} text-black h-full`}>
            {formatName(asset)}
          </span>
        )}
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
        {asset.maturityDate && asset.type != 'acao' && asset.type != 'etf' ? formatDate(asset.maturityDate) : "-"}
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
