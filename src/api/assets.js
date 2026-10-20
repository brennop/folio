import { z } from "zod";

// Row format of the $FIRE_DATA tsv (see ~/projects/fire, src/hooks/load-data.ts):
// type  ticker  amount  maturityDate  buyDate  rate
// `amount` is either "<quantity>@<price>" (stock/etf) or the invested amount
const optional = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const rowSchema = z.object({
  type: z.enum(["stock", "etf", "cdb_di", "cdb_pre", "lci_di", "lci_pre", "lca_di", "lca_pre", "ntn_b", "lft"]),
  ticker: z.string(),
  amount: z.string(),
  maturityDate: optional(date),
  buyDate: date,
  rate: optional(z.coerce.number()),
});

// fire type -> folio asset fields
const typeMap = {
  stock: { type: "acao" },
  etf: { type: "etf" },
  cdb_di: { type: "cdb", rateType: "cdi" },
  cdb_pre: { type: "cdb", rateType: "prefixado" },
  lci_di: { type: "lci", rateType: "cdi" },
  lci_pre: { type: "lci", rateType: "prefixado" },
  lca_di: { type: "lca", rateType: "cdi" },
  lca_pre: { type: "lca", rateType: "prefixado" },
  ntn_b: { type: "tesouro_ipca" },
  lft: { type: "tesouro_selic" },
};

function toAsset(row, id) {
  const { type, ticker, amount, maturityDate, buyDate, rate } = rowSchema.parse(row);
  const mapped = typeMap[type];

  if (mapped.type === "acao" || mapped.type === "etf") {
    const [quantity, avgPrice] = amount.split("@").map(Number);
    return { id, ...mapped, ticker: ticker.toUpperCase(), quantity, avgPrice, buyDate };
  }

  return { id, ...mapped, bank: ticker || undefined, amount: Number(amount), rate, maturityDate, buyDate };
}

function parseTsv(text) {
  const [header, ...lines] = text.split(/\r?\n/).filter((line) => line.trim());
  const columns = header.split("\t");

  return lines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(columns.map((column, i) => [column, values[i] ?? ""]));
  });
}

export default async function handler() {
  const path = process.env.FIRE_DATA;
  if (!path) {
    return Response.json({ error: "FIRE_DATA is not set" }, { status: 500 });
  }

  try {
    const rows = parseTsv(await Bun.file(path).text());
    // Row number as id: stable as long as the file isn't reordered
    return Response.json(rows.map((row, i) => toAsset(row, i + 1)));
  } catch (error) {
    console.error(`Failed to read ${path}:`, error);
    return Response.json({ error: "Failed to read FIRE_DATA" }, { status: 500 });
  }
}
