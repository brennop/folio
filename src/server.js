import index from './index.html';
import assets from './api/assets';
import quotes from './api/quotes';
import indices from './api/indices';
import bcbSeries from './api/bcb-series';

const server = Bun.serve({
  // Keep 3000: stock targets and cached values live in IndexedDB/localStorage, which are origin-scoped
  port: Number(process.env.PORT) || 3000,
  // Default is 10s, which cuts off /api/bcb-series while it waits (up to 10s) on the slow BCB API
  idleTimeout: 30,
  development: process.env.NODE_ENV !== 'production' && { hmr: true, console: true },
  routes: {
    '/': index,
    '/stocks': index,
    '/api/assets': { GET: assets },
    '/api/quotes': { POST: quotes },
    '/api/indices': { GET: indices },
    '/api/bcb-series': { GET: bcbSeries },
  },
});

console.log(`Folio running at ${server.url}`);

// `bun --hot` re-runs this module on every save; globalThis survives reloads, so only open once
if (!globalThis.browserOpened && !process.env.NO_OPEN) {
  globalThis.browserOpened = true;
  const cmd = { darwin: ['open'], win32: ['cmd', '/c', 'start', ''] }[process.platform] ?? ['xdg-open'];
  try {
    Bun.spawn([...cmd, server.url.href], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {} // no opener available (e.g. headless box); the URL is logged above
}
