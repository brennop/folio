import index from './index.html';
import parse from './api/parse';
import quotes from './api/quotes';
import indices from './api/indices';
import bcbSeries from './api/bcb-series';

const server = Bun.serve({
  // Keep 3000: IndexedDB/localStorage are origin-scoped, changing the port "loses" data
  port: Number(process.env.PORT) || 3000,
  // Default is 10s, which cuts off /api/bcb-series while it waits (up to 10s) on the slow BCB API
  idleTimeout: 30,
  development: process.env.NODE_ENV !== 'production' && { hmr: true, console: true },
  routes: {
    '/': index,
    '/stocks': index,
    '/api/parse': { POST: parse },
    '/api/quotes': { POST: quotes },
    '/api/indices': { GET: indices },
    '/api/bcb-series': { GET: bcbSeries },
  },
});

console.log(`Folio running at ${server.url}`);
