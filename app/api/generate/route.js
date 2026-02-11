import { OpenAI } from "openai";
import { extractFromHTML } from "./extract";
import {
  getSellerData,
  getProductData,
  getBrandPriceData,
  getProductPriceData,
  getProductProblemsData,
  getBrandSellerMatch,
} from "./search";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== CORE HELPERS ===================== */

async function gptKnowledge(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4.1-nano",
      input: prompt,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

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

async function evaluateTrust({ area, scoreHint, facts, fallbackReason }) {
  const text = await gptKnowledge(`
You are evaluating trust for an ecommerce listing.

Area: ${area}
Suggested score from signals (0 to 5): ${scoreHint}

Facts:
${facts}

Return JSON only:
{
  "score": number,
  "reason": "Exactly two short sentences based only on the facts."
}
`);

  const parsed = safeJSON(text, null);

  return {
    score: clampScore(parsed?.score ?? scoreHint),
    reason: parsed?.reason || fallbackReason,
  };
}

async function buildAiResult(extracted, analyses) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData,
    productProblemsData,
    brandSellerMatch,
  } = analyses;

  let websiteScore = 3;
  const websiteFacts = [];

  if (extracted.platform?.includes("amazon")) {
    websiteScore += 1;
    websiteFacts.push("Marketplace is a known mainstream platform.");
  } else if (extracted.platform) {
    websiteFacts.push(`Platform detected as ${extracted.platform}.`);
  }

  let sellerScore = 3;
  const sellerFacts = [];

  if (brandSellerMatch === "yes") {
    sellerScore += 1;
    sellerFacts.push("Seller appears to match the brand storefront.");
  } else if (brandSellerMatch === "no") {
    sellerScore -= 1;
    sellerFacts.push("Seller does not clearly match the brand storefront.");
  }

  if (sellerData) {
    sellerFacts.push(sellerData);
  }

  let productScore = 3;
  const productFacts = [];

  if (productData) {
    productFacts.push(productData);
  }

  if (productProblemsData) {
    productFacts.push(productProblemsData);
    if (!productProblemsData.toLowerCase().includes("no common")) {
      productScore -= 1;
    }
  }

  const listingPrice = parsePrice(extracted.price);
  const referenceAverage =
    brandPriceData?.match(/\d+[\d,.]*/)?.[0] ??
    productPriceData?.match(/\d+[\d,.]*/)?.[0] ??
    null;

  const referenceAverageNumber = parsePrice(referenceAverage);

  if (listingPrice && referenceAverageNumber) {
    if (listingPrice > referenceAverageNumber * 1.5) {
      productScore -= 1;
      productFacts.push("Listing price appears much higher than common market pricing.");
    } else if (listingPrice < referenceAverageNumber * 0.6) {
      productScore -= 1;
      productFacts.push("Listing price appears unusually low compared with market pricing.");
    }
  }

  const [websiteTrust, sellerTrust, productTrust] = await Promise.all([
    evaluateTrust({
      area: "Website Trust",
      scoreHint: websiteScore,
      facts: websiteFacts.join("\n") || "No strong website facts were detected.",
      fallbackReason:
        "The website shows limited risk signals. More direct verification is still recommended.",
    }),
    evaluateTrust({
      area: "Seller Trust",
      scoreHint: sellerScore,
      facts: sellerFacts.join("\n") || "No strong seller facts were detected.",
      fallbackReason:
        "Seller details are limited from the available evidence. Verify return policy and seller history before purchase.",
    }),
    evaluateTrust({
      area: "Product Trust",
      scoreHint: productScore,
      facts: productFacts.join("\n") || "No strong product facts were detected.",
      fallbackReason:
        "Product evidence is limited from the available facts. Compare price and quality signals with trusted listings.",
    }),
  ]);
  
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
          ? "Signals look mostly consistent with a legitimate listing. Keep normal purchase safeguards in place."
          : "Multiple trust signals indicate elevated purchase risk. Verify seller, pricing, and return protections before buying.",
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

    const [
      sellerData,
      productData,
      brandPriceData,
      productPriceData,
      productProblemsData,
      brandSellerMatch,
    ] = await Promise.all([
      getSellerData(extracted.seller),
      getProductData({ brand: extracted.brand, product: extracted.product }),
      getBrandPriceData({ brand: extracted.brand, product: extracted.product }),
      getProductPriceData(extracted.product),
      getProductProblemsData(extracted.product),
      getBrandSellerMatch({ brand: extracted.brand, seller: extracted.seller }),
    ]);

    const aiResult = await buildAiResult(extracted, {
      sellerData,
      productData,
      brandPriceData,
      productPriceData,
      productProblemsData,
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
