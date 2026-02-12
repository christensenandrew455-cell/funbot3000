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

/* ===================== TITLE CLASSIFICATION ===================== */

/**
 * Raw title → { product, brand }
 * Example:
 * product: "earbuds"
 * brand: "apple airpods"
 */
export async function simplifyProductTitle({ brand, product }) {
  if (!product) return null;

  const text = await gptKnowledge(`
You are classifying an ecommerce product title.

Original title:
${product}

Known brand (if any):
${brand || "unknown"}

Return JSON only:
{
  "product": "generic product category (e.g. earbuds, laptop, smartwatch)",
  "brand": "recognizable product line or branded family name"
}

Rules:
- Product must be generic (object type only).
- Brand should reflect how people commonly refer to the product (e.g. 'apple airpods').
- Remove marketing terms, condition notes, and model numbers unless they define the product family.
- Use lowercase.
`);

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]);
    return {
      product: parsed?.product || null,
      brand: parsed?.brand || null,
    };
  } catch {
    return null;
  }
}

/* ===================== SEARCH ===================== */

/**
 * Seller → what people report about them
 */
export async function getSellerData(seller) {
  if (!seller) return null;

  return gptSearch(`
Search for information about this seller.

Seller:
${seller}

Summarize what is commonly mentioned about this seller online.
Include anything notable that comes up.

Return one short paragraph.
`);
}

/**
 * Brand + Product → what people say about the thing
 */
export async function getProductData({ brand, product }) {
  if (!brand || !product) return null;

  return gptSearch(`
Search for information about this product.

Product:
${brand} ${product}

Summarize what people commonly mention about it online.

Return one short paragraph.
`);
}

/**
 * Brand + Product → price mentions
 */
export async function getBrandPriceData({ brand, product }) {
  if (!brand || !product) return null;

  return gptSearch(`
Search for pricing information about this product.

Product:
${brand} ${product}

Summarize typical prices or price ranges mentioned online.

Return one short paragraph.
`);
}

/**
 * Product type → general market pricing
 */
export async function getProductPriceData(product) {
  if (!product) return null;

  return gptKnowledge(`
Based on general market knowledge, what is a typical price range for this type of product?

Product type:
${product}

Return one short paragraph.
`);
}

/**
 * Product → commonly reported problems
 */
export async function getProductProblemsData(product) {
  if (!product) return null;

  return gptSearch(`
Search for discussions or reports about problems with this product.

Product:
${product}

Summarize commonly mentioned issues if any appear.

Return one short paragraph.
`);
}

/**
 * Brand vs Seller alignment
 */
export async function getBrandSellerMatch({ brand, seller }) {
  if (!brand || !seller) return null;

  const result = await gptKnowledge(`
Is this seller likely an official or authorized seller of this product line?

Brand:
${brand}

Seller:
${seller}

Return only:
YES or NO
`);

  if (!result) return null;
  return result.trim().toUpperCase().startsWith("Y") ? "yes" : "no";
}
