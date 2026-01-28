import { useState, useEffect } from 'react';
import { Geist } from 'next/font/google';
import { getAllAssets, addAsset, deleteAsset } from '@/lib/db';
import AssetList from '@/components/AssetList';
import ChatInput from '@/components/ChatInput';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export default function Home() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    getAllAssets().then(setAssets);
  }, []);

  const handleSubmit = async (text) => {
    // Mock parsing - creates a stock asset from input
    // TODO: Replace with LLM parsing
    const asset = {
      type: 'acao',
      ticker: text.toUpperCase().slice(0, 5),
      quantity: 100,
      avgPrice: 35,
    };

    const id = await addAsset(asset);
    setAssets([...assets, { ...asset, id }]);
  };

  const handleDelete = async (id) => {
    await deleteAsset(id);
    setAssets(assets.filter((a) => a.id !== id));
  };

  return (
    <div
      className={`${geistSans.className} flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black`}
    >
      <main className="flex h-screen w-full max-w-3xl flex-col bg-white dark:bg-black py-8 px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            Folio
          </h1>
        </header>

        <AssetList assets={assets} onDelete={handleDelete} />

        <div className="mt-4">
          <ChatInput onSubmit={handleSubmit} />
        </div>
      </main>
    </div>
  );
}
