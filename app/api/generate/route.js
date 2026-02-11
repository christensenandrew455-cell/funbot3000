import { OpenAI } from "openai";
import { extractFromHTML } from "./extract";
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

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Math.round(numeric)));
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAiResult(extracted, analyses) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData,
    productProblems,
    brandSellerMatch,
  } = analyses;

  let websiteScore = 3;
  const websiteReasons = [];

  if (extracted.platform?.includes("amazon")) {
    websiteScore += 1;
    websiteReasons.push("Marketplace is a known mainstream platform.");
  } else if (extracted.platform) {
    websiteReasons.push(`Platform detected as ${extracted.platform}.`);
  }

  let sellerScore = 3;
  const sellerReasons = [];

  if (sellerData?.positive) {
    sellerScore += 1;
    sellerReasons.push("Independent sources show positive seller signals.");
  }

  if (sellerData?.negative) {
    sellerScore -= 2;
    sellerReasons.push("Independent sources show seller complaints or warnings.");
  }

  if (brandSellerMatch === true) {
    sellerScore += 1;
    sellerReasons.push("Seller appears to match the brand storefront.");
  } else if (brandSellerMatch === false) {
    sellerScore -= 1;
    sellerReasons.push("Seller does not clearly match the brand storefront.");
  }

  if (sellerData?.summary) {
    sellerReasons.push(sellerData.summary);
  }

  let productScore = 3;
  const productReasons = [];

  if (productData?.positive) {
    productScore += 1;
    productReasons.push("Product reputation appears positive.");
  }

  if (productData?.negative) {
    productScore -= 1;
    productReasons.push("Product has negative reputation indicators.");
  }

  if (Array.isArray(productProblems?.issues) && productProblems.issues.length > 0) {
    productScore -= 1;
    productReasons.push(`Common issues: ${productProblems.issues.slice(0, 2).join(", ")}.`);
  }

  if (productData?.summary) {
    productReasons.push(productData.summary);
  }

  const listingPrice = parsePrice(extracted.price);
  const referenceAverage =
    brandPriceData?.average ?? productPriceData?.average ?? null;

  if (listingPrice && referenceAverage) {
    if (listingPrice > referenceAverage * 1.5) {
      productScore -= 1;
      productReasons.push("Listing price appears much higher than common market pricing.");
    } else if (listingPrice < referenceAverage * 0.6) {
      productScore -= 1;
      productReasons.push("Listing price appears unusually low compared with market pricing.");
    }
  }

  const websiteTrust = {
    score: clampScore(websiteScore),
    reason:
      websiteReasons.join(" ") ||
      "Insufficient website risk signals were available.",
  };

  const sellerTrust = {
    score: clampScore(sellerScore),
    reason:
      sellerReasons.join(" ") ||
      "Insufficient seller data was available.",
  };

  const productTrust = {
    score: clampScore(productScore),
    reason:
      productReasons.join(" ") ||
      "Insufficient product data was available.",
  };

  const overallScore = clampScore(
    (websiteTrust.score + sellerTrust.score + productTrust.score) / 3
  );

  const status = overallScore >= 3 ? "good" : "bad";

  return {
    status,
    title: extracted.product || "Unknown Product",
    websiteTrust,
    sellerTrust,
    productTrust,
    overall: {
      score: overallScore,
      reason:
        status === "good"
          ? "Signals look mostly consistent with a legitimate listing."
          : "Multiple trust signals indicate elevated purchase risk.",
    },
  };
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const extracted = await extractFromHTML(url);

    if (!extracted) {
      return Response.json(
        {
          error:
            "Could not extract enough product information from this page.",
        },
        { status: 422 }
      );
    }

    const [sellerData, productData, brandPriceData, productPriceData, productProblems, brandSellerMatch] =
      await Promise.all([
        getSellerData(extracted.seller),
        getProductData(extracted.brand, extracted.product),
        getBrandPriceData(extracted.brand, extracted.product),
        getProductPriceData(extracted.product),
        getProductProblems(extracted.product),
        getBrandSellerMatch(extracted.brand, extracted.seller),
      ]);

    const aiResult = buildAiResult(extracted, {
      sellerData,
      productData,
      brandPriceData,
      productPriceData,
      productProblems,
      brandSellerMatch,
    });

    return Response.json({
      aiResult,
      extracted,
    });
  } catch {
    return Response.json({ error: "Request failed." }, { status: 500 });
  }
}
