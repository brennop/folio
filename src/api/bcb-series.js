// api/bcb-series.js
// GET /api/bcb-series?startDate=YYYY-MM-DD
// Returns CDI, SELIC and IPCA series from Banco Central do Brasil.
//
// BCB is slow and erratic (cold queries take 5-30s regardless of the range
// size, and it sometimes answers with an HTML error page), and past rates never
// change. So series are kept in a file cache, requests never wait on BCB, and
// BCB is only asked for what is missing, in the background:
//  - history before the earliest cached date; until it arrives the series is
//    listed in `pending` and left out of `data`, and the client retries
//  - entries after the latest cached one, at most every REFRESH_INTERVAL_MS

import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

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
  ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'folio', 'bcb-series.json')

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 h
const FETCH_TIMEOUT_MS = 60_000
// BCB rejects daily-series queries spanning more than 10 years
const MAX_RANGE_YEARS = 10

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

function addYears(isoDate, years) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() + years)
  return date.toISOString().slice(0, 10)
}

const today = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// File cache
// ---------------------------------------------------------------------------

/**
 * Per series key: { from, checkedAt, entries }
 *  - from: earliest date BCB was queried from (history before it is unknown)
 *  - checkedAt: when the tail was last fetched
 *  - entries: BCB rows ({ data: 'DD/MM/YYYY', valor }) sorted by date
 *
 * @type {Promise<Record<string, { from: string; checkedAt: number; entries: { data: string; valor: string }[] }>> | null}
 */
let cachePromise = null

function loadCache() {
  cachePromise ??= Bun.file(CACHE_PATH).json().catch(() => ({}))
  return cachePromise
}

async function saveCache(cache) {
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true })
    await Bun.write(CACHE_PATH, JSON.stringify(cache))
  } catch (err) {
    console.error('[bcb-series] failed to write cache', err)
  }
}

/** Merges rows into `entries`, deduplicating by date and keeping it sorted. */
function merge(entries, rows) {
  const byDate = new Map(entries.map((row) => [normaliseToIso(row.data), row]))
  for (const row of rows) byDate.set(normaliseToIso(row.data), row)
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row)
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

  return res.json()
}

/** Fetches [startIso, endIso], split into ranges BCB accepts. */
async function fetchSeries(code, startIso, endIso) {
  const rows = []
  for (let from = startIso; from <= endIso; from = addDays(addYears(from, MAX_RANGE_YEARS), 1)) {
    const to = addYears(from, MAX_RANGE_YEARS)
    rows.push(...await fetchRange(code, from, to < endIso ? to : endIso))
  }
  return rows
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** @type {Map<string, Promise<void>>} in-flight syncs, so concurrent requests share them */
const inFlight = new Map()

function once(key, fn) {
  if (!inFlight.has(key)) {
    inFlight.set(key, fn().finally(() => inFlight.delete(key)))
  }
  return inFlight.get(key)
}

/** Fetches history from `startIso` up to what is cached (or up to today). */
function backfill(name, startIso) {
  return once(`backfill:${name}`, async () => {
    const cache = await loadCache()
    const entry = cache[name]
    if (entry && entry.from <= startIso) return

    const end = entry ? addDays(entry.from, -1) : today()
    const rows = await fetchSeries(SERIES[name].code, startIso, end)

    // Re-read: a tail refresh may have updated the entry during the fetch
    const current = cache[name]
    cache[name] = {
      from: startIso,
      checkedAt: current?.checkedAt ?? Date.now(),
      entries: merge(current?.entries ?? [], rows),
    }
    await saveCache(cache)
  })
}

/** Fetches entries newer than the latest cached one. */
function refreshTail(name) {
  return once(`tail:${name}`, async () => {
    const cache = await loadCache()
    const entry = cache[name]
    if (!entry || Date.now() - entry.checkedAt < REFRESH_INTERVAL_MS) return

    // Start after the latest entry, not after `checkedAt`: IPCA for month M
    // is published in M+1 but dated 01/M
    const last = entry.entries.at(-1)
    const start = last ? addDays(normaliseToIso(last.data), 1) : entry.from
    const rows = start <= today() ? await fetchSeries(SERIES[name].code, start, today()) : []

    // Re-read: a backfill may have replaced the entry during the fetch
    const current = cache[name]
    current.entries = merge(current.entries, rows)
    current.checkedAt = Date.now()
    await saveCache(cache)
  })
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

  const cache = await loadCache()
  const data = {}
  const pending = []

  for (const [name, series] of Object.entries(SERIES)) {
    const entry = cache[name]
    if (!entry || entry.from > isoDate) {
      pending.push(name)
      backfill(name, isoDate).catch((err) => console.error(`[bcb-series] ${name} backfill failed:`, err.message))
      continue
    }

    refreshTail(name).catch((err) => console.error(`[bcb-series] ${name} refresh failed:`, err.message))

    // Monthly entries are dated on the 1st, so keep the start date's month
    const cutoff = series.monthly ? `${isoDate.slice(0, 8)}01` : isoDate
    data[name] = entry.entries.filter((row) => normaliseToIso(row.data) >= cutoff)
  }

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
