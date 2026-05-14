import { formatCurrency } from "@/lib/format";
import Tooltip from "@/components/Tooltip";

function formatDailyChange(dailyChange) {
  if (dailyChange == null || dailyChange === "") return "";

  const change = Number(dailyChange);
  if (!Number.isFinite(change)) return "";

  return ` (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`;
}

export default function TickerPrice({
  ticker,
  pricePerShare,
  dailyChange,
  className = "",
}) {
  const price = Number(pricePerShare);
  const hasPrice = Number.isFinite(price);
  const content = hasPrice
    ? `${formatCurrency(price)}${formatDailyChange(dailyChange)}`
    : null;
  const badge = (
    <span className={`${className} text-black h-full ${hasPrice ? "cursor-default" : ""}`}>
      {ticker}
    </span>
  );

  if (!content) {
    return badge;
  }

  return <Tooltip content={content}>{badge}</Tooltip>;
}
