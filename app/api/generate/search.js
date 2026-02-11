import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== GPT HELPERS ===================== */

async function gptSearch(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

async function gptKnowledge(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

/* ===================== PUBLIC ===================== */

/**
 * Seller → sellerData
 */
export async function getSellerData(seller) {
  if (!seller) return null;

  return gptSearch(`
Find neutral, factual information about this seller.

Seller:
${seller}

Focus on:
- legitimacy
- customer experience
- fulfillment and support issues

Return ONE short factual paragraph.
No scoring. No conclusions.
`);
}

/**
 * Brand + Product → productData
 */
export async function getProductData({ brand, product }) {
  if (!brand || !product) return null;

  return gptSearch(`
Find neutral, independent information about this product.

Brand and product:
${brand} ${product}

Focus on:
- quality reputation
- typical customer experience
- value for price

Return ONE short factual paragraph.
No scoring. No conclusions.
`);
}

/**
 * Brand + Product → brandPriceData (via search)
 */
export async function getBrandPriceData({ brand, product }) {
  if (!brand || !product) return null;

  return gptSearch(`
Find the typical online price range for this product.

Brand and product:
${brand} ${product}

Focus on:
- average price
- common price range

Return ONE short factual paragraph.
No conclusions.
`);
}

/**
 * Product → productPriceData (GPT knowledge only)
 */
export async function getProductPriceData(product) {
  if (!product) return null;

  return gptKnowledge(`
Based on general market knowledge, estimate the typical price range
for this type of product.

Product:
${product}

Return ONE short factual paragraph.
No conclusions.
`);
}

/**
 * Product → productProblemsData (GPT knowledge only)
 */
export async function getProductProblemsData(product) {
  if (!product) return null;

  return gptKnowledge(`
List common problems or complaints associated with this type of product.

Product:
${product}

Return ONE short factual paragraph.
No conclusions.
`);
}

/**
 * Brand + Seller → brandSellerMatch (YES / NO)
 */
export async function getBrandSellerMatch({ brand, seller }) {
  if (!brand || !seller) return null;

  const result = await gptKnowledge(`
Determine whether this seller is likely an official or legitimate seller
of this brand.

Brand:
${brand}

Seller:
${seller}

Return ONLY one word:
YES or NO
`);

  if (!result) return null;

  return result.trim().toUpperCase().startsWith("Y") ? "yes" : "no";
}
