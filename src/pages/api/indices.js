let indicesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const DEFAULTS = {
  cdi: { daily: 0.000489, annual: 13.25 }, // ~13.25% annual
  selic: 13.25,
  ipca: 4.5,
};

async function fetchBCBSeries(seriesCode) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`;
  const response = await fetch(url, { timeout: 5000 });
  if (!response.ok) throw new Error(`BCB returned ${response.status}`);
  const data = await response.json();
  return parseFloat(data[0]?.valor) || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return cached data if still valid
  if (indicesCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return res.status(200).json(indicesCache);
  }

  const result = {
    cdi: { ...DEFAULTS.cdi },
    selic: DEFAULTS.selic,
    ipca: DEFAULTS.ipca,
  };

  try {
    // Series 12 = CDI daily rate
    const cdiDaily = await fetchBCBSeries(12);
    if (cdiDaily !== null) {
      result.cdi.daily = cdiDaily / 100; // Convert percentage to decimal
      result.cdi.annual = (Math.pow(1 + result.cdi.daily, 252) - 1) * 100;
    }
  } catch (error) {
    console.error('Failed to fetch CDI:', error.message);
  }

  try {
    // Series 432 = SELIC target rate
    const selic = await fetchBCBSeries(432);
    if (selic !== null) {
      result.selic = selic;
    }
  } catch (error) {
    console.error('Failed to fetch SELIC:', error.message);
  }

  try {
    // Series 433 = IPCA 12-month accumulated
    const ipca = await fetchBCBSeries(433);
    if (ipca !== null) {
      result.ipca = ipca;
    }
  } catch (error) {
    console.error('Failed to fetch IPCA:', error.message);
  }

  // Update cache
  indicesCache = result;
  cacheTimestamp = Date.now();

  res.status(200).json(result);
}
