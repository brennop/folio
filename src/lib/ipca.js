/**
 * calculateTesouroIpca.js
 *
 * Estimates the current value of a Tesouro IPCA+ position.
 *
 * Approximations vs. Tesouro Direto's official pricing:
 *  - IPCA correction starts from the calendar month of buyDate (not the
 *    official VNA base-date of the bond). For an exact result you'd need the
 *    VNA at the purchase date, which Tesouro publishes daily.
 *  - Spread is compounded over calendar days (actual/365), not business days.
 *  - IOF is ignored (assumes holding period > 30 days).
 *  - IR follows the standard regressivo table applied on gross profit only
 *    (the IPCA correction itself is also taxed in practice; the whole
 *    nominal gain above principal is taxable).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses YYYY-MM-DD or DD/MM/YYYY into a Date (midnight UTC).
 * Throws if the format is unrecognised.
 */
function parseDate(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Invalid date input')

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00Z`)
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    return new Date(`${y}-${m}-${d}T00:00:00Z`)
  }

  throw new Error(`Unrecognised date format: "${raw}". Use YYYY-MM-DD or DD/MM/YYYY.`)
}

/**
 * Returns the IR alíquota (regressivo table) for a given holding period.
 *
 * Days  | Alíquota
 * ------|---------
 * ≤ 180 | 22.5 %
 * ≤ 360 | 20.0 %
 * ≤ 720 | 17.5 %
 * > 720 | 15.0 %
 */
function irRate(calendarDays) {
  if (calendarDays <= 180) return 0.225
  if (calendarDays <= 360) return 0.20
  if (calendarDays <= 720) return 0.175
  return 0.15
}

/** Rounds a number to `places` decimal places. */
function round(value, places = 2) {
  return Math.round(value * 10 ** places) / 10 ** places
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * @param {object} params
 * @param {number} params.principal
 *   Amount invested in BRL.
 *
 * @param {string} params.buyDate
 *   Purchase date. Accepts YYYY-MM-DD or DD/MM/YYYY.
 *
 * @param {number} params.spread
 *   Real annual rate in percent (e.g. 5.5 for Tesouro IPCA+ 5.50%).
 *
 * @param {Array<{ data: string; valor: string }>} params.ipca
 *   BCB série 433 array. Each entry has:
 *     data  – "MM/YYYY"
 *     valor – monthly IPCA variation in percent (e.g. "0.42")
 *
 * @returns {{
 *   currentValue:   number,   // net value after IR (what you'd receive today)
 *   grossValue:     number,   // value before IR deduction
 *   profit:         number,   // grossValue − principal  (nominal gross gain)
 *   profitPercent:  number,   // profit as % of principal
 *   ipcaFactor:     number,   // cumulative IPCA correction factor, e.g. 1.0842
 *   spreadFactor:   number,   // cumulative spread factor
 *   irRate:         number,   // applicable IR alíquota (0.15 … 0.225)
 *   calendarDays:   number,
 *   ipcaMonthsUsed: number,
 * }}
 */
export function calculateTesouroIpca({ principal, buyDate, spread, ipca }) {
  if (typeof principal !== 'number' || principal <= 0) {
    throw new Error('`principal` must be a positive number.')
  }
  if (typeof spread !== 'number' || spread < 0) {
    throw new Error('`spread` must be a non-negative number (percent per year).')
  }
  if (!Array.isArray(ipca) || ipca.length === 0) {
    throw new Error('`ipca` must be a non-empty array.')
  }

  const buyDateObj    = parseDate(buyDate)
  const today         = new Date()
  const calendarDays  = Math.floor((today - buyDateObj) / 86_400_000)

  if (calendarDays < 0) {
    throw new Error('`buyDate` cannot be in the future.')
  }

  // ------------------------------------------------------------------
  // 1. Cumulative IPCA factor
  //    Include months where the IPCA reference month (MM/YYYY) falls
  //    on or after the calendar month of buyDate.
  // ------------------------------------------------------------------
  const buyYear  = buyDateObj.getUTCFullYear()
  const buyMonth = buyDateObj.getUTCMonth() // 0-indexed

  const ipcaFactor = ipca.reduce((acc, { data, valor }) => {
    // data format: "MM/YYYY"
    const [mm, yyyy] = data.split('/')
    const entryYear  = parseInt(yyyy, 10)
    const entryMonth = parseInt(mm, 10) - 1 // 0-indexed

    const isOnOrAfterBuy =
      entryYear > buyYear ||
      (entryYear === buyYear && entryMonth >= buyMonth)

    if (!isOnOrAfterBuy) return acc

    const monthlyRate = parseFloat(valor)
    if (isNaN(monthlyRate)) return acc

    return acc * (1 + monthlyRate / 100)
  }, 1)

  const ipcaMonthsUsed = ipca.filter(({ data }) => {
    const [mm, yyyy] = data.split('/')
    const entryYear  = parseInt(yyyy, 10)
    const entryMonth = parseInt(mm, 10) - 1
    return (
      entryYear > buyYear ||
      (entryYear === buyYear && entryMonth >= buyMonth)
    )
  }).length

  // ------------------------------------------------------------------
  // 2. Spread factor compounded over calendar days (actual/365)
  //    grossValue = principal × ipcaFactor × (1 + spread)^(days/365)
  // ------------------------------------------------------------------
  const years        = calendarDays / 365
  const spreadFactor = Math.pow(1 + spread / 100, years)

  // ------------------------------------------------------------------
  // 3. Gross and net values
  // ------------------------------------------------------------------
  const grossValue  = principal * ipcaFactor * spreadFactor
  const profit      = grossValue - principal
  const tax         = profit * irRate(calendarDays)
  const currentValue = grossValue - tax

  return {
    currentValue:   round(currentValue, 2),
    grossValue:     round(grossValue, 2),
    profit:         round(profit, 2),
    profitPercent:  round((profit / principal) * 100, 4),
    // diagnostic / breakdown fields
    ipcaFactor:     round(ipcaFactor, 6),
    spreadFactor:   round(spreadFactor, 6),
    irRate:         irRate(calendarDays),
    calendarDays,
    ipcaMonthsUsed,
  }
}
