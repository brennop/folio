export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// `new Date("YYYY-MM-DD")` is UTC midnight, which is the previous day in Brazil.
// Parse date-only strings as local midnight instead.
export function parseDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return new Date(dateStr);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

// Today as YYYY-MM-DD in local time
export function todayIso() {
  return new Date().toLocaleDateString("sv-SE");
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  return parseDate(dateStr).toLocaleDateString("pt-BR");
}

export function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
