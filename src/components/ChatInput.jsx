import { useState } from 'react';

export default function ChatInput({ onSubmit }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex: 100 PETR4 a R$35"
        className="flex-1 px-4 py-3 bg-zinc-100 bg-zinc-900 text-zinc-200 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-zinc-700"
      />
      <button
        type="submit"
        className="px-4 py-3 bg-zinc-800 bg-zinc-200 text-white text-zinc-900 hover:bg-zinc-700 hover:bg-zinc-300 transition-colors"
        aria-label="Enviar"
      >
        ↑
      </button>
    </form>
  );
}
