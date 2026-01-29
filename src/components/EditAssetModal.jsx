import { useState, useEffect } from 'react';

export default function EditAssetModal({ asset, onSave, onCancel }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setFormData({ ...asset });
  }, [asset]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const getTypeLabel = (type) => {
    const labels = {
      acao: 'Ação',
      etf: 'ETF',
      cdb: 'CDB',
      lci: 'LCI',
      lca: 'LCA',
      tesouro_selic: 'Tesouro Selic',
      tesouro_ipca: 'Tesouro IPCA+',
      tesouro_prefixado: 'Tesouro Prefixado',
    };
    return labels[type] || type.toUpperCase();
  };

  const isStock = asset.type === 'acao' || asset.type === 'etf';
  const isFixedIncome = asset.type === 'cdb' || asset.type === 'lci' || asset.type === 'lca';
  const isTesouro = asset.type?.startsWith('tesouro_');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border-2 border-zinc-700 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Editar {getTypeLabel(asset.type)}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isStock && (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Ticker</label>
                <input
                  type="text"
                  value={formData.ticker || ''}
                  onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Quantidade</label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => handleChange('quantity', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Preço Médio (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.avgPrice || ''}
                  onChange={(e) => handleChange('avgPrice', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </>
          )}

          {isFixedIncome && (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Banco/Emissor</label>
                <input
                  type="text"
                  value={formData.bank || ''}
                  onChange={(e) => handleChange('bank', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleChange('amount', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Taxa (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate || ''}
                  onChange={(e) => handleChange('rate', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tipo de Taxa</label>
                <select
                  value={formData.rateType || 'cdi'}
                  onChange={(e) => handleChange('rateType', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value="cdi">% do CDI</option>
                  <option value="prefixado">Prefixado (a.a.)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Vencimento</label>
                <input
                  type="date"
                  value={formData.maturityDate || ''}
                  onChange={(e) => handleChange('maturityDate', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </>
          )}

          {isTesouro && (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleChange('amount', Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Taxa (%) - opcional</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate || ''}
                  onChange={(e) => handleChange('rate', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Vencimento</label>
                <input
                  type="date"
                  value={formData.maturityDate || ''}
                  onChange={(e) => handleChange('maturityDate', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Data da Compra</label>
            <input
              type="date"
              value={formData.buyDate || ''}
              onChange={(e) => handleChange('buyDate', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
