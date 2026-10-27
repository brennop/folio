// api/bcb-series.js
// GET /api/bcb-series?startDate=YYYY-MM-DD
// Returns CDI, SELIC and IPCA series from Banco Central do Brasil.
//
// BCB is slow and erratic (cold queries take 5-30s regardless of the range
// size, and it sometimes answers with an HTML error page), and past rates never
// change. So series are cached in SQLite per calendar year, via cachified:
//  - settled years never expire
//  - the current year is refreshed in the background every REFRESH_INTERVAL_MS,
//    serving the cached copy meanwhile (and when BCB fails)
// Requests never wait on BCB: years that aren't cached within YEAR_WAIT_MS are
// listed in `pending` and left out of `data`, and the client retries.

import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { cachified } from '@epic-web/cachified'
import { z } from 'zod'

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
  ipca:  { code: 433, label: 'IPCA',  description: 'IPCA variação mensal (%)', monthly: true },
}

const CACHE_PATH = process.env.FOLIO_CACHE
  ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'folio', 'bcb.sqlite')

const DAY_MS = 24 * 60 * 60 * 1000
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 h
const FETCH_TIMEOUT_MS = 60_000
const YEAR_WAIT_MS = 1_000
// A year is settled once late publications are in (IPCA for December comes out in January)
const SETTLE_DAYS = 60

const rowsSchema = z.array(z.object({ data: z.string(), valor: z.string() }))

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

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const today = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

mkdirSync(dirname(CACHE_PATH), { recursive: true })
const db = new Database(CACHE_PATH)
db.run('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
const getEntry = db.query('SELECT value FROM cache WHERE key = ?')
const setEntry = db.query('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)')
const deleteEntry = db.query('DELETE FROM cache WHERE key = ?')

/**
 * cachified adapter storing entries (value + metadata) as JSON.
 * Not cachified-adapter-sqlite: it rewrites `metadata.ttl` to ttl + swr, so
 * entries never turn stale. Infinite ttls are serialised as null, which
 * cachified reads as "forever", so swr must stay finite.
 *
 * @type {import('@epic-web/cachified').Cache}
 */
const cache = {
  name: 'bcb-sqlite',
  get: (key) => {
    const row = getEntry.get(key)
    return row ? JSON.parse(row.value) : null
  },
  set: (key, entry) => { setEntry.run(key, JSON.stringify(entry)) },
  delete: (key) => { deleteEntry.run(key) },
}

/** BCB rows ({ data: 'DD/MM/YYYY', valor }) of `code` for one calendar year. */
function fetchYear(code, year) {
  const settled = year < Number(addDays(today(), -SETTLE_DAYS).slice(0, 4))
  return cachified({
    key: `bcb:${code}:${year}`,
    cache,
    checkValue: rowsSchema,
    ttl: settled ? Infinity : REFRESH_INTERVAL_MS,
    swr: 365 * DAY_MS,
    fallbackToCache: true,
    getFreshValue: async () => {
      const until = (iso) => (iso < today() ? iso : today())
      try {
        return await fetchRange(code, `${year}-01-01`, until(`${year}-12-31`))
      } catch (err) {
        // BCB fails some ranges consistently (CDI 2024 answers {"erro":{}}),
        // while halves of them work
        if (`${year}-07-01` > today()) throw err
        const halves = await Promise.all([
          fetchRange(code, `${year}-01-01`, `${year}-06-30`),
          fetchRange(code, `${year}-07-01`, until(`${year}-12-31`)),
        ])
        return halves.flat()
      }
    },
  })
}

/** Resolves to `promise`'s value, or to undefined if it takes longer than `ms`. */
function within(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve) => { timer = setTimeout(resolve, ms) }),
  ]).finally(() => clearTimeout(timer))
}

// ---------------------------------------------------------------------------
// BCB fetch
// ---------------------------------------------------------------------------

async function fetchRange(code, startIso, endIso) {
  const url =
    `${BCB_BASE}.${code}/dados?formato=json` +
    `&dataInicial=${encodeURIComponent(toBcbDate(startIso))}` +
    `&dataFinal=${encodeURIComponent(toBcbDate(endIso))}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  // BCB answers 404 when the range has no entries (e.g. a weekend)
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`BCB API returned ${res.status} for series ${code}`)
  }
  // Under load BCB answers 200 with an HTML error page
  if (!res.headers.get('content-type')?.includes('json')) {
    throw new Error(`BCB API returned ${res.headers.get('content-type')} for series ${code}`)
  }

  // ...or with {"erro":{}}
  const body = await res.json()
  if (!Array.isArray(body)) {
    throw new Error(`BCB API returned ${JSON.stringify(body).slice(0, 100)} for series ${code}`)
  }
  return body
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
  if (isoDate > today()) {
    return Response.json({ error: '`startDate` cannot be in the future.' }, { status: 400 })
  }

  const startYear = Number(isoDate.slice(0, 4))
  const years = Array.from({ length: Number(today().slice(0, 4)) - startYear + 1 }, (_, i) => startYear + i)
  const data = {}
  const pending = []

  await Promise.all(Object.entries(SERIES).map(async ([name, series]) => {
    const rows = await Promise.all(years.map((year) => {
      // Keeps fetching (and filling the cache) after the wait runs out
      const fetching = fetchYear(series.code, year).catch((err) => {
        console.error(`[bcb-series] ${name} ${year} failed:`, err.message)
      })
      return within(fetching, YEAR_WAIT_MS)
    }))

    if (rows.some((r) => r === undefined)) {
      pending.push(name)
      return
    }

    // Monthly entries are dated on the 1st, so keep the start date's month
    const cutoff = series.monthly ? `${isoDate.slice(0, 8)}01` : isoDate
    data[name] = rows.flat().filter((row) => normaliseToIso(row.data) >= cutoff)
  }))

  const payload = {
    meta: {
      startDate: isoDate,
      series: Object.fromEntries(Object.entries(SERIES).map(([name, series]) => [name, series.description])),
    },
    data,
    pending,
  }

  // Don't let the browser cache an incomplete answer
  return Response.json(payload, {
    headers: { 'Cache-Control': pending.length ? 'no-store' : 'public, max-age=3600' },
  })
}
