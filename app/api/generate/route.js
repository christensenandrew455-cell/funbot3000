import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== CORE HELPERS ===================== */

async function gptSearch(prompt, useWeb = false) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: useWeb ? [{ type: "web_search_preview" }] : undefined,
      input: prompt,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

function safeJSON(text, fallback = null) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch {
    return fallback;
  }
}

/* ===================== SELLER DATA ===================== */
/* Uses GPT + web search */

export async function getSellerData(seller) {
  if (!seller) return null;

  const text = await gptSearch(
    `
Find neutral, independent seller information.

Seller:
${seller}

Focus on:
- legitimacy
- customer experience
- fulfillment / refunds
- common complaints

Return JSON only:
{
  "exists": boolean,
  "positive": boolean,
  "negative": boolean,
  "summary": string
}
`,
    true
  );

  return safeJSON(text);
}

/* ===================== PRODUCT DATA ===================== */
/* Brand + product via GPT + web search */

export async function getProductData(brand, product) {
  if (!product) return null;

  const query = brand ? `${brand} ${product}` : product;

  const text = await gptSearch(
    `
Find neutral product information.

Product:
${query}

Focus on:
- build quality
- performance vs expectations
- general reputation

Return JSON only:
{
  "positive": boolean,
  "negative": boolean,
  "summary": string
}
`,
    true
  );

  return safeJSON(text);
}

/* ===================== BRAND PRICE DATA ===================== */
/* GPT + web search */

export async function getBrandPriceData(brand, product) {
  if (!product) return null;

  const query = brand ? `${brand} ${product}` : product;

  const text = await gptSearch(
    `
Estimate average online pricing.

Product:
${query}

Return JSON only:
{
  "min": number,
  "max": number,
  "average": number
}
`,
    true
  );

  return safeJSON(text);
}

/* ===================== PRODUCT PRICE DATA ===================== */
/* GPT general knowledge ONLY (no search) */

export async function getProductPriceData(product) {
  if (!product) return null;

  const text = await gptSearch(
    `
Using general knowledge only, estimate typical pricing.

Product:
${product}

Return JSON only:
{
  "min": number,
  "max": number,
  "average": number
}
`
  );

  return safeJSON(text);
}

/* ===================== PRODUCT PROBLEMS ===================== */
/* GPT general knowledge ONLY */

export async function getProductProblems(product) {
  if (!product) return null;

  const text = await gptSearch(
    `
List common consumer issues.

Product:
${product}

Return JSON only:
{
  "issues": string[]
}
`
  );

  return safeJSON(text);
}

/* ===================== BRAND = SELLER MATCH ===================== */
/* GPT logic only */

export async function getBrandSellerMatch(brand, seller) {
  if (!brand || !seller) return null;

  const text = await gptSearch(
    `
Determine whether the seller is the brand itself or an authorized brand storefront.

Brand: ${brand}
Seller: ${seller}

Return JSON only:
{
  "match": boolean
}
`
  );

  return safeJSON(text)?.match ?? null;
}
