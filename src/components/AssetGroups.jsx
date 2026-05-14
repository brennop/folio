import { useMemo } from "react";
import { formatAssetName } from "@/lib/assets";
import { formatCurrency, formatPercent } from "@/lib/format";
import TickerPrice from "@/components/TickerPrice";

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

const typeOrder = {
  acao: 0,
  etf: 1,
  cdb: 2,
  lci: 3,
  lca: 4,
  tesouro_selic: 5,
  tesouro_ipca: 6,
  tesouro_prefixado: 7,
};

function getInvestedValue(asset, assetValue) {
  if (assetValue?.invested != null) return assetValue.invested;
  if (asset.type === "acao" || asset.type === "etf") {
    return (Number(asset.quantity) || 0) * (Number(asset.avgPrice) || 0);
  }
  return Number(asset.amount) || 0;
}

export default function AssetGroups({ assets, assetValues = {} }) {
  const groups = useMemo(() => {
    const rowsByName = assets.reduce((acc, asset) => {
      const name = formatAssetName(asset);
      const assetValue = assetValues[asset.id];
      const currentValue = assetValue?.currentValue ?? getInvestedValue(asset, assetValue);
      const invested = getInvestedValue(asset, assetValue);

      if (!acc.has(name)) {
        acc.set(name, {
          name,
          asset,
          assetValue,
          quantity: 0,
          invested: 0,
          currentValue: 0,
        });
      }

      const row = acc.get(name);
      if (asset.type === "acao" || asset.type === "etf") {
        row.quantity += Number(asset.quantity) || 0;
      }
      row.invested += invested;
      row.currentValue += currentValue;

      return acc;
    }, new Map());

    return Array.from(rowsByName.values())
      .map((group) => ({
        ...group,
        profitPercent: group.invested ? ((group.currentValue - group.invested) / group.invested) * 100 : 0,
      }))
      .sort((a, b) => {
        const aTypeOrder = typeOrder[a.asset.type] ?? Number.MAX_SAFE_INTEGER;
        const bTypeOrder = typeOrder[b.asset.type] ?? Number.MAX_SAFE_INTEGER;
        if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [assets, assetValues]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400">
        Nenhum ativo cadastrado
      </div>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black">
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            <th className="p-1">Nome</th>
            <th className="p-1">Qtd</th>
            <th className="p-1">Investido</th>
            <th className="p-1">Atual</th>
            <th className="p-1">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isVariableIncome = group.asset.type === "acao" || group.asset.type === "etf";

            return (
              <tr key={group.name} className="text-zinc-400 text-sm">
                <td className="">
                  {isVariableIncome ? (
                    <TickerPrice
                      ticker={group.name}
                      pricePerShare={group.assetValue?.pricePerShare}
                      dailyChange={group.assetValue?.dailyChange}
                      className={palette[group.asset.type]}
                    />
                  ) : (
                    <span className={`${palette[group.asset.type]} text-black h-full`}>
                      {group.name}
                    </span>
                  )}
                </td>
                <td className="">{isVariableIncome ? group.quantity : "-"}</td>
                <td className="">{formatCurrency(group.invested)}</td>
                <td className="">{formatCurrency(group.currentValue)}</td>
                <td className="">
                  <span
                    className={`${group.profitPercent >= 0 ? "bg-green-400" : "bg-red-400"} text-black border-y`}
                  >
                    {formatPercent(group.profitPercent)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
