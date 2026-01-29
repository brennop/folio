import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const assetSchema = z.object({
  type: z.enum([
    "acao",
    "etf",
    "cdb",
    "lci",
    "lca",
    "tesouro_selic",
    "tesouro_ipca",
    "tesouro_prefixado",
  ]),
  buyDate: z.string().optional().describe("Date of purchase in YYYY-MM-DD format"),
  // Stock/ETF fields
  ticker: z.string().optional().describe("Stock/ETF ticker symbol (required for acao/etf)"),
  quantity: z.number().optional().describe("Number of shares (required for acao/etf)"),
  avgPrice: z.number().optional().describe("Average price per share (required for acao/etf)"),
  // Fixed income fields
  bank: z.string().optional().describe("Bank name (required for cdb/lci/lca)"),
  amount: z.number().optional().describe("Investment amount in BRL (required for cdb/lci/lca/tesouro)"),
  rate: z.number().optional().describe("Interest rate percentage, e.g. 110 for 110% CDI (required for cdb/lci/lca)"),
  rateType: z.enum(["cdi", "prefixado"]).optional().describe("Rate type: 'cdi' for percentage of CDI (e.g., 110% CDI), 'prefixado' for fixed yearly rate (e.g., 14% a.a.)"),
  maturityDate: z.string().optional().describe("Maturity date in YYYY-MM-DD format"),
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemPrompt = `You are an asset parser for a Brazilian investment portfolio app.
Parse the user's input and extract asset information.

Asset types and REQUIRED fields:

STOCKS/ETFs (type: "acao" or "etf"):
- ticker (REQUIRED): Stock symbol, e.g., PETR4, VALE3, BOVA11
- quantity (REQUIRED): Number of shares
- avgPrice (REQUIRED): Average price per share in BRL
- buyDate (optional): Purchase date in YYYY-MM-DD format

FIXED INCOME (type: "cdb", "lci", or "lca"):
- bank (REQUIRED): Bank or institution name
- amount (REQUIRED): Investment amount in BRL
- rate (REQUIRED): The rate value (e.g., 110 for 110% CDI, or 14 for 14% a.a.)
- rateType (REQUIRED): "cdi" for percentage of CDI, "prefixado" for fixed yearly rate
- maturityDate (optional): Maturity date in YYYY-MM-DD format
- buyDate (optional): Purchase date in YYYY-MM-DD format

TESOURO DIRETO (type: "tesouro_selic", "tesouro_ipca", or "tesouro_prefixado"):
- amount (REQUIRED): Investment amount in BRL
- rate (optional): Spread for IPCA+ or fixed rate for Prefixado
- maturityDate (optional): Maturity date in YYYY-MM-DD format
- buyDate (optional): Purchase date in YYYY-MM-DD format

Examples:
- "100 PETR4 a R$35.50" → type: acao, ticker: PETR4, quantity: 100, avgPrice: 35.50
- "CDB Nubank 10000 110% CDI" → type: cdb, bank: Nubank, amount: 10000, rate: 110, rateType: cdi
- "CDB Sofisa 5000 14% a.a." → type: cdb, bank: Sofisa, amount: 5000, rate: 14, rateType: prefixado
- "LCI Inter 5000 95% CDI vence 2025-12-01" → type: lci, bank: Inter, amount: 5000, rate: 95, rateType: cdi, maturityDate: 2025-12-01
- "Tesouro Selic 2000 reais" → type: tesouro_selic, amount: 2000`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  console.log(assetSchema.toJSONSchema());

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `${systemPrompt}\n\nParse this asset: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: assetSchema.toJSONSchema(),
      },
    });

    console.log(response.text);

    const asset = JSON.parse(response.text);

    // Default buyDate to today if not provided
    if (!asset.buyDate) {
      asset.buyDate = new Date().toISOString().split('T')[0];
    }

    res.status(200).json(asset);
  } catch (error) {
    console.error("Gemini API error:", error);

    res.status(500).json({ error: "Failed to parse asset" });
  }
}
