const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tickers } = req.body;

  if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: 'tickers array is required' });
  }

  const results = {};
  const tickersToFetch = [];

  // Check cache first
  for (const ticker of tickers) {
    const cacheKey = ticker.toUpperCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results[ticker] = cached.data;
    } else {
      tickersToFetch.push(ticker);
    }
  }

  // Fetch missing tickers
  const fetchPromises = tickersToFetch.map(async (ticker) => {
    const yahooTicker = `${ticker.toUpperCase()}.SA`;
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}`);
      }

      const data = await response.json();
      const meta = data.chart?.result?.[0]?.meta;

      if (!meta) {
        throw new Error('Invalid response structure');
      }

      const price = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || meta.previousClose;
      const change = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;

      const result = { price, change };

      // Cache the result
      cache.set(ticker.toUpperCase(), {
        data: result,
        timestamp: Date.now(),
      });

      results[ticker] = result;
    } catch (error) {
      console.error(`Failed to fetch ${ticker}:`, error.message);
      results[ticker] = { error: error.message };
    }
  });

  await Promise.all(fetchPromises);

  res.status(200).json(results);
}
