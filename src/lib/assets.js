export function formatAssetName(asset) {
  const type = asset.type || "ativo";

  if (asset.type === "acao" || asset.type === "etf") {
    return asset.ticker || type.toUpperCase();
  }

  if (asset.type === "cdb" || asset.type === "lci" || asset.type === "lca") {
    return `${type.toUpperCase()} ${asset.bank || ""}`.trim();
  }

  if (asset.type?.startsWith("tesouro_")) {
    const typeLabels = {
      tesouro_selic: "Tesouro Selic",
      tesouro_ipca: "Tesouro IPCA+",
      tesouro_prefixado: "Tesouro Prefixado",
    };

    return typeLabels[asset.type] || type.toUpperCase();
  }

  return `${type.toUpperCase()} ${asset.bank || ""}`.trim();
}
