import { useState, useMemo } from "react";
import { formatAssetName } from "@/lib/assets";
import AssetRow from "@/components/AssetRow";

const columns = [
  { key: "buyDate", label: "Data", getValue: (a) => a.buyDate && new Date(a.buyDate) },
  { key: "name", label: "Nome", getValue: (a) => formatAssetName(a)?.toLowerCase() },
  { key: "value", label: "Valor" },
  { key: "currentValue", label: "Atual", getValue: (a, v) => v?.currentValue },
  { key: "profitPercent", label: "Lucro", getValue: (a, v) => v?.profitPercent },
  { key: "maturityDate", label: "Vencimento", getValue: (a) => a.maturityDate && new Date(a.maturityDate) },
  { key: "edit", label: "" },
  { key: "delete", label: "" },
];

export default function AssetList({
  assets,
  assetValues = {},
  indices,
  onDelete,
  onEdit,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const sortedAssets = useMemo(() => {
    const col = columns.find((c) => c.key === sortConfig.key);
    if (!col?.getValue) return assets;

    return [...assets].sort((a, b) => {
      const aValue = col.getValue(a, assetValues[a.id]);
      const bValue = col.getValue(b, assetValues[b.id]);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const cmp = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
  }, [assets, assetValues, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: "asc" };
    });
  };

  if (assets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Nenhum ativo cadastrado
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black">
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`p-1 ${col.getValue ? "cursor-pointer hover:text-zinc-200 select-none" : ""}`}
                onClick={col.getValue ? () => handleSort(col.key) : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              assetValue={assetValues[asset.id]}
              indices={indices}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
