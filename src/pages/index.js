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

  return (
    <div
      className={`${geistSans.className} flex min-h-screen items-center justify-center bg-black`}
    >
      <main className="flex h-screen w-full max-w-3xl flex-col bg-black py-8 px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">
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
