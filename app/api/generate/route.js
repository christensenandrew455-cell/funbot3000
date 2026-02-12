import { OpenAI } from "openai";
import { extractFromHTML } from "./extract";
import {
  getSellerData,
  getProductData,
  getBrandPriceData,
  getProductPriceData,
  getProductProblemsData,
  getBrandSellerMatch,
  simplifyProductTitle,
} from "./search";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function gptKnowledge(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-5-nano",
      input: prompt,
    });
    return res.output_text || null;
  } catch {
    return null;
  }
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

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/* ===================== TRUST EVALUATOR ===================== */
/* GPT JUSTIFIES — IT DOES NOT DECIDE */

async function evaluateTrust({ area, scoreHint, facts, fallbackReason }) {
  const text = await gptKnowledge(`
You are explaining a trust score for an ecommerce product.

Area: ${area}
Score (already decided): ${scoreHint}/5

Facts:
${facts}

Return JSON only:
{
  "score": ${scoreHint},
  "reason": "Exactly two short factual sentences."
}
`);

  const parsed = safeJSON(text, null);

  return {
    score: scoreHint,
    reason: parsed?.reason || fallbackReason,
  };
}

/* ===================== CORE LOGIC ===================== */

async function buildAiResult(extracted, analyses) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData,
    productProblemsData,
    brandSellerMatch,
  } = analyses;

  const isAmazon = extracted.platform?.includes("amazon");

  /* ---------- WEBSITE TRUST ---------- */
  let websiteScore = isAmazon ? 5 : 3;
  const websiteFacts = [];

  if (isAmazon) {
    websiteFacts.push("Listing is hosted on Amazon, a mainstream marketplace with buyer protections.");
  } else if (extracted.platform) {
    websiteFacts.push(`Platform detected as ${extracted.platform}.`);
  }

  /* ---------- SELLER TRUST ---------- */
  let sellerScore = isAmazon ? 4 : 3;
  const sellerFacts = [];

  if (brandSellerMatch === "yes") {
    sellerScore += 1;
    sellerFacts.push("Seller appears aligned with the brand storefront.");
  }

  if (sellerData) {
    sellerFacts.push(sellerData);
  }

  sellerScore = clampScore(sellerScore);

  /* ---------- PRODUCT TRUST ---------- */
  let productScore = isAmazon ? 4 : 3;
  const productFacts = [];

  if (productData) productFacts.push(productData);

  if (productProblemsData) {
    const problems = productProblemsData.toLowerCase();

    // ONLY penalize for real defects
    if (
      problems.includes("break") ||
      problems.includes("unsafe") ||
      problems.includes("fake") ||
      problems.includes("defect")
    ) {
      productScore -= 1;
      productFacts.push("Some reports indicate possible functional or safety defects.");
    } else {
      productFacts.push("Reported issues appear to be preference or usage-related, not defects.");
    }
  }

  /* ---------- PRICE CONTEXT ---------- */
  const listingPrice = parsePrice(extracted.price);
  const referencePrice =
    parsePrice(brandPriceData?.match(/\d+[\d,.]*/)?.[0]) ||
    parsePrice(productPriceData?.match(/\d+[\d,.]*/)?.[0]);

  let isOverpriced = false;

  if (listingPrice && referencePrice) {
    if (listingPrice > referencePrice * 1.5) {
      isOverpriced = true;
      productScore -= 1;
      productFacts.push("Listing price is significantly higher than typical market pricing.");
    } else if (listingPrice <= referencePrice * 1.2) {
      productScore += 1;
      productFacts.push("Price is competitive for this product category.");
    }
  }

  productScore = clampScore(productScore);

  /* ---------- FINAL TRUST OBJECTS ---------- */
  const [websiteTrust, sellerTrust, productTrust] = await Promise.all([
    evaluateTrust({
      area: "Website Trust",
      scoreHint: websiteScore,
      facts: websiteFacts.join("\n"),
      fallbackReason: "The website appears legitimate with standard buyer protections.",
    }),
    evaluateTrust({
      area: "Seller Trust",
      scoreHint: sellerScore,
      facts: sellerFacts.join("\n"),
      fallbackReason: "Seller appears legitimate with no strong risk signals.",
    }),
    evaluateTrust({
      area: "Product Trust",
      scoreHint: productScore,
      facts: productFacts.join("\n"),
      fallbackReason: "Product appears consistent with expectations for its category and price.",
    }),
  ]);

  /* ---------- OVERALL ---------- */
  let status = "good product";
  let overallScore = 4;
  let overallMeaning = "Solid value";
  let overallReason =
    "Trust signals are stable and the product aligns with expectations for its price category.";

  if (websiteTrust.score <= 1 || sellerTrust.score <= 1) {
    status = "scam";
    overallScore = 1;
    overallMeaning = "Avoid";
    overallReason = "Critical trust failures detected with the seller or platform.";
  } else if (productTrust.score <= 2) {
    status = "untrustworthy";
    overallScore = 2;
    overallMeaning = "Quality concerns";
    overallReason =
      "Some functional concerns were identified. Consider alternatives if quality is critical.";
  } else if (isOverpriced) {
    status = "overpriced";
    overallScore = 3;
    overallMeaning = "Safe but poor value";
    overallReason =
      "Product appears legitimate but is priced higher than comparable alternatives.";
  }

  return {
    status,
    title: extracted.product || "Unknown Product",
    websiteTrust,
    sellerTrust,
    productTrust,
    overall: {
      score: overallScore,
      meaning: overallMeaning,
      reason: overallReason,
    },
  };
}

/* ===================== API ===================== */

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const extracted = await extractFromHTML(url);
    if (!extracted) {
      return Response.json(
        { error: "Could not extract enough product information." },
        { status: 422 }
      );
    }

    const simplified = await simplifyProductTitle({
      brand: extracted.brand,
      product: extracted.product || extracted.rawTitle,
    });

    if (simplified) extracted.product = simplified;

    const analyses = await Promise.all([
      getSellerData(extracted.seller),
      getProductData({ brand: extracted.brand, product: extracted.product }),
      getBrandPriceData({ brand: extracted.brand, product: extracted.product }),
      getProductPriceData(extracted.product),
      getProductProblemsData(extracted.product),
      getBrandSellerMatch({ brand: extracted.brand, seller: extracted.seller }),
    ]);

    const aiResult = await buildAiResult(extracted, {
      sellerData: analyses[0],
      productData: analyses[1],
      brandPriceData: analyses[2],
      productPriceData: analyses[3],
      productProblemsData: analyses[4],
      brandSellerMatch: analyses[5],
    });

    return Response.json({ aiResult, extracted });
  } catch {
    return Response.json({ error: "Request failed." }, { status: 500 });
  }
}
