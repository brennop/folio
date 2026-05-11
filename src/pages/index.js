import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Geist_Mono } from 'next/font/google';
import { getAllAssets, addAsset, deleteAsset, updateAsset } from '@/lib/db';
import AssetList from '@/components/AssetList';
import EditAssetModal from '@/components/EditAssetModal';
import ChatInput from '@/components/ChatInput';
import PortfolioSummary from '@/components/PortfolioSummary';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function Home() {
  const [assets, setAssets] = useState([]);
  const [editingAsset, setEditingAsset] = useState(null);
  const fileInputRef = useRef(null);
  const { totalValue, profit, profitPercent, assetValues, rendaFixaTotal, rendaVariavelTotal, investedThisYear, indices, isLoading, error } = usePortfolioValue(assets);

  useEffect(() => {
    getAllAssets().then(setAssets);
  }, []);

  const handleSubmit = async (text) => {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error('Failed to parse asset');
      return;
    }

    const asset = await res.json();
    const id = await addAsset(asset);
    setAssets([...assets, { ...asset, id }]);
  };

  const handleDelete = async (id) => {
    await deleteAsset(id);
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
  };

  const handleSave = async (updatedAsset) => {
    await updateAsset(updatedAsset);
    setAssets(assets.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
    setEditingAsset(null);
  };

  const handleDownload = () => {
    const json = JSON.stringify(assets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'folio-assets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const imported = JSON.parse(text);

    for (const asset of imported) {
      const { id, ...rest } = asset;
      await addAsset(rest);
    }

    const updated = await getAllAssets();
    setAssets(updated);
    e.target.value = '';
  };

  return (
    <div
      className={`${geistMono.className} flex min-h-screen items-center justify-center bg-black`}
    >
      <main className="flex h-screen w-full max-w-4xl flex-col bg-black py-8 px-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Folio
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/stocks"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Ações
            </Link>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              ref={fileInputRef}
              hidden
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Importar JSON"
              title="Importar JSON"
            >
              ↑
            </button>
            <button
              onClick={handleDownload}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Baixar JSON"
              title="Baixar JSON"
            >
              ↓
            </button>
          </div>
        </header>

        <PortfolioSummary
          totalValue={totalValue}
          profit={profit}
          profitPercent={profitPercent}
          rendaFixaTotal={rendaFixaTotal}
          rendaVariavelTotal={rendaVariavelTotal}
          investedThisYear={investedThisYear}
          isLoading={isLoading}
          error={error}
        />

        <AssetList assets={assets} assetValues={assetValues} indices={indices} onDelete={handleDelete} onEdit={handleEdit} />

        <div className="mt-4">
          <ChatInput onSubmit={handleSubmit} />
        </div>

        {editingAsset && (
          <EditAssetModal
            asset={editingAsset}
            onSave={handleSave}
            onCancel={() => setEditingAsset(null)}
          />
        )}
      </main>
    </div>
  );
}
