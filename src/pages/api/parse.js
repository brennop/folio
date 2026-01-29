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
  buyDate: z
    .string()
    .describe("Date of purchase in YYYY-MM-DD format"),
  ticker: z.string().optional().describe("Stock/ETF ticker symbol"),
  quantity: z.number().optional().describe("Number of shares"),
  avgPrice: z.number().optional().describe("Average price per share"),
  bank: z.string().optional().describe("Bank name for fixed income"),
  amount: z.number().optional().describe("Investment amount in BRL"),
  rate: z.number().optional().describe("Interest rate percentage"),
  maturityDate: z
    .string()
    .optional()
    .describe("Maturity date in YYYY-MM-DD format"),
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemPrompt = `You are an asset parser for a Brazilian investment portfolio app.
Parse the user's input and extract asset information.

Asset types:
- "acao": Brazilian stocks (e.g., PETR4, VALE3, ITUB4)
- "etf": ETFs (e.g., BOVA11, IVVB11)
- "cdb": CDB (Certificado de Depósito Bancário)
- "lci": LCI (Letra de Crédito Imobiliário)
- "lca": LCA (Letra de Crédito do Agronegócio)
- "tesouro_selic": Tesouro Selic
- "tesouro_ipca": Tesouro IPCA+
- "tesouro_prefixado": Tesouro Prefixado

For stocks/ETFs, extract: ticker, quantity, avgPrice, buyDate
For fixed income (CDB/LCI/LCA), extract: bank, amount, rate (as percentage, e.g., 110 for 110% CDI), maturityDate
For Tesouro, extract: amount, rate, maturityDate

Examples:
- "100 PETR4 a R$35.50" → acao, ticker: PETR4, quantity: 100, avgPrice: 35.50
- "CDB Nubank 10000 110% CDI vence 2025-12-01" → cdb, bank: Nubank, amount: 10000, rate: 110, maturityDate: 2025-12-01
- "comprei 50 VALE3 por 68 reais em 2024-01-15" → acao, ticker: VALE3, quantity: 50, avgPrice: 68, buyDate: 2024-01-15`;

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
