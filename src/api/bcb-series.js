// api/bcb-series.js
// GET /api/bcb-series?startDate=YYYY-MM-DD
// Returns CDI, SELIC and IPCA series from Banco Central do Brasil.

const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'

/**
 * BCB series codes
 *
 * CDI  12  – Taxa de juros - CDI (% a.d., daily)
 * SELIC 11 – Taxa de juros - Selic (% a.d., daily)
 * IPCA 433 – IPCA - variação mensal (%, monthly, date = 01/MM/YYYY)
 */
const SERIES = {
  cdi:   { code: 12,  label: 'CDI',   description: 'CDI diária (% a.d.)' },
  selic: { code: 11,  label: 'SELIC', description: 'SELIC diária (% a.d.)' },
  ipca:  { code: 433, label: 'IPCA',  description: 'IPCA variação mensal (%)' },
}

// ---------------------------------------------------------------------------
// Simple in-process cache (survives across requests in the same Node process)
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 h

/** @type {Map<string, { data: unknown; expiresAt: number }>} */
const cache = new Map()

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Normalises the caller's input to ISO format (YYYY-MM-DD).
 * Accepts YYYY-MM-DD and DD/MM/YYYY.
 * Returns null when the input is unrecognised.
 */
function normaliseToIso(raw) {
  if (!raw || typeof raw !== 'string') return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    return `${y}-${m}-${d}`
  }

  return null
}

/** Converts YYYY-MM-DD → DD/MM/YYYY (the format BCB expects). */
function toBcbDate(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// BCB fetch
// ---------------------------------------------------------------------------

async function fetchSeries(code, bcbStartDate) {
  const url =
    `${BCB_BASE}.${code}/dados` +
    `?formato=json&dataInicial=${encodeURIComponent(bcbStartDate)}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Node 18+ supports native fetch; keep a reasonable timeout via AbortSignal.
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`BCB API returned ${res.status} for series ${code}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=3600'

export default async function handler(req) {
  const startDate = new URL(req.url).searchParams.get('startDate')

  if (!startDate) {
    return Response.json({ error: 'Query param `startDate` is required (YYYY-MM-DD or DD/MM/YYYY)' }, { status: 400 })
  }

  const isoDate = normaliseToIso(startDate)

  if (!isoDate) {
    return Response.json({
      error: 'Invalid `startDate`. Use YYYY-MM-DD or DD/MM/YYYY.',
    }, { status: 400 })
  }

  // Reject future dates (BCB won't have data past today anyway)
  const todayIso = new Date().toISOString().slice(0, 10)
  if (isoDate > todayIso) {
    return Response.json({ error: '`startDate` cannot be in the future.' }, { status: 400 })
  }

  const cacheKey = `bcb-series:${isoDate}`
  const hit = getCached(cacheKey)

  if (hit) {
    return Response.json(hit, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': CACHE_CONTROL },
    })
  }

  const bcbDate = toBcbDate(isoDate)

  try {
    const [cdi, selic, ipca] = await Promise.all([
      fetchSeries(SERIES.cdi.code,   bcbDate),
      fetchSeries(SERIES.selic.code, bcbDate),
      fetchSeries(SERIES.ipca.code,  bcbDate),
    ])

    const payload = {
      meta: {
        startDate: isoDate,
        fetchedAt: new Date().toISOString(),
        series: {
          cdi:   SERIES.cdi.description,
          selic: SERIES.selic.description,
          ipca:  SERIES.ipca.description,
        },
      },
      data: { cdi, selic, ipca },
    }

    setCached(cacheKey, payload)

    return Response.json(payload, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': CACHE_CONTROL },
    })
  } catch (err) {
    console.error('[bcb-series]', err)
    return Response.json({
      error: 'Failed to fetch data from BCB.',
      detail: err.message,
    }, { status: 502 })
  }
}
