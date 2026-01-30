import AssetRow from "@/components/AssetRow";

export default function AssetList({
  assets,
  assetValues = {},
  indices,
  onDelete,
  onEdit,
}) {
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
        <thead>
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            <th className="p-1">Data</th>
            <th className="p-1">Nome</th>
            <th className="p-1">Valor</th>
            <th className="p-1">Atual</th>
            <th className="p-1">Lucro</th>
            <th className="p-1">Vencimento</th>
            <th className="p-1"></th>
            <th className="p-1"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
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
