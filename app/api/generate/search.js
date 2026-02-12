import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== UTILS ===================== */

function safeJSON(text, fallback = null) {
  if (!text || typeof text !== "string") return fallback;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch {
    return fallback;
  }
}

function cleanParagraph(v) {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s;
}

/* ===================== ONE-CALL SEARCH ===================== */
/**
 * Single web-search-enabled call that returns ALL requested outputs at once.
 * Inputs:
 *  - seller
 *  - brandSimple
 *  - product (generic category like "earbuds")
 * Output JSON:
 *  {
 *    "sellerData": "...",
 *    "productData": "...",
 *    "brandPriceData": "...",
 *    "productPriceData": "...",
 *    "productProblemsData": "..."
 *  }
 */
export async function runAllSearches({ seller, brandSimple, product }) {
  const openai = getClient();
  if (!openai) return null;

  const prompt = `
You are gathering neutral, fact-based background information to help a user understand an ecommerce listing.

Rules (important):
- Be neutral and factual. Do not use emotional language. Do not label anything a scam.
- If you do not find clear information, return: "No clear information found."
- Keep each field to 1 short paragraph (2–4 sentences max).
- Prefer widely-cited/credible sources when possible.
- Return JSON only with the exact keys below.

Inputs:
Seller: ${seller || "unknown"}
Brand/Query (brandSimple): ${brandSimple || "unknown"}
Product category (generic): ${product || "unknown"}

Return JSON only:
{
  "sellerData": "General info people mention about the seller (neutral).",
  "productData": "General info people mention about the brandSimple item (neutral).",
  "brandPriceData": "Typical prices/ranges mentioned online for brandSimple (neutral).",
  "productPriceData": "Typical general market price range for the product category (neutral).",
  "productProblemsData": "Commonly mentioned issues or complaints tied to brandSimple (neutral)."
}
`;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    const text = res.output_text || null;
    const parsed = safeJSON(text, null);
    if (!parsed) return null;

    return {
      sellerData: cleanParagraph(parsed.sellerData) || "No clear information found.",
      productData: cleanParagraph(parsed.productData) || "No clear information found.",
      brandPriceData: cleanParagraph(parsed.brandPriceData) || "No clear information found.",
      productPriceData: cleanParagraph(parsed.productPriceData) || "No clear information found.",
      productProblemsData:
        cleanParagraph(parsed.productProblemsData) || "No clear information found.",
    };
  } catch {
    return null;
  }
}

/* ===================== COMPAT WRAPPERS ===================== */
/**
 * These keep your existing route.js calls working if you still call the old functions.
 * BUT: for best performance/cost, call runAllSearches() once and use the returned fields.
 */

export async function getSellerData(seller) {
  const all = await runAllSearches({ seller, brandSimple: null, product: null });
  return all?.sellerData || null;
}

export async function getProductData(brandSimple) {
  const all = await runAllSearches({ seller: null, brandSimple, product: null });
  return all?.productData || null;
}

export async function getBrandPriceData(brandSimple) {
  const all = await runAllSearches({ seller: null, brandSimple, product: null });
  return all?.brandPriceData || null;
}

export async function getProductPriceData(product) {
  const all = await runAllSearches({ seller: null, brandSimple: null, product });
  return all?.productPriceData || null;
}

export async function getProductProblemsData(brandSimple) {
  const all = await runAllSearches({ seller: null, brandSimple, product: null });
  return all?.productProblemsData || null;
}
