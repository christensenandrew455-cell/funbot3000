export const runtime = "nodejs";

import { OpenAI } from "openai";
import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  analyzeBrand,
  analyzeSeller,
  isBraveConfigured,
} from "./search.js";

/* ===================== OPENAI ===================== */

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/* ===================== UTIL ===================== */

function safeJSONParse(text, fallback = {}) {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "");
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

function getResponseText(res) {
  if (res.output_text) return res.output_text;
  for (const msg of res.output || []) {
    for (const c of msg.content || []) {
      if (c.text) return c.text;
    }
  }
  return "";
}

function normalizeEntity(str) {
  if (!str) return null;
  return str
    .toLowerCase()
    .replace(/official|store|shop|llc|ltd|inc|co\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function brandSellerRelationship(brand, seller) {
  if (!brand || !seller) return "unknown";
  const s = seller.toLowerCase();
  if (s.includes("amazon")) return "marketplace";

  const nb = normalizeEntity(brand);
  const ns = normalizeEntity(seller);

  if (!nb || !ns) return "unknown";
  if (ns === nb) return "exact";
  if (ns.includes(nb) || nb.includes(ns)) return "acceptable";

  return "mismatch";
}

function clampScore(score, fallback = 2) {
  if (typeof score !== "number" || Number.isNaN(score)) return fallback;
  return Math.max(1, Math.min(5, Math.round(score)));
}

/* ===================== PRICE ===================== */

function classifyPrice(price, market) {
  if (!price || !market) return "unknown";
  if (price < market.median * 0.7) return "suspiciously_low";
  if (price > market.median * 1.3) return "suspiciously_high";
  return "reasonable";
}

/* ===================== AI ===================== */

async function aiInferCategory(name) {
  if (!name) return null;
  const openai = getOpenAIClient();
  if (!openai) return null;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Determine the most appropriate retail product category.

Product:
${name}

Return JSON ONLY:
{ "category": string }
`,
  });

  const parsed = safeJSONParse(getResponseText(res), {});
  return typeof parsed.category === "string" ? parsed.category : null;
}

async function aiValidateCategory(name, category) {
  if (!name || !category) return null;
  const openai = getOpenAIClient();
  if (!openai) return null;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Does the product below reasonably belong in this category?

Product:
${name}

Category:
${category}

Return JSON ONLY:
{ "fits": boolean }
`,
  });

  const parsed = safeJSONParse(getResponseText(res), {});
  return typeof parsed.fits === "boolean" ? parsed.fits : null;
}

async function getMarketPriceRange(name, category) {
  if (!name) return null;
  const openai = getOpenAIClient();
  if (!openai) return null;

  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: `
Estimate the typical online market price range.
Avoid extremes.

Product:
${name}
Category:
${category || "unknown"}

Return JSON ONLY:
{ "min": number, "max": number, "median": number }
`,
  });

  const parsed = safeJSONParse(getResponseText(res), null);
  if (
    !parsed ||
    typeof parsed.min !== "number" ||
    typeof parsed.max !== "number" ||
    typeof parsed.median !== "number"
  ) {
    return null;
  }

  return parsed;
}

/* ===================== WEBSITE TRUST ===================== */

function scoreWebsite(platform, signals) {
  let score = 2;
  let reason = "Limited independent trust signals for this website.";

  if (platform?.includes("amazon")) {
    return {
      score: 5,
      reason: "Amazon is a well-established marketplace.",
    };
  }

  if (signals?.complaints) {
    score = 1;
    reason = "External complaints detected.";
  } else if (signals?.marketplace) {
    score = 3;
    reason = "Seller appears to operate on known marketplaces.";
  }

  return { score, reason };
}

/* ===================== ROUTE ===================== */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    const productInfo = await extractFromHTML(url);
    if (!productInfo?.title) {
      return new Response(
        JSON.stringify({ error: "Failed to extract product" }),
        { status: 400 }
      );
    }

    const simplifiedTitle = simplifyTitle(productInfo.title);

    const category = await aiInferCategory(simplifiedTitle);
    const categoryFits = await aiValidateCategory(
      simplifiedTitle,
      category
    );

    const market = await getMarketPriceRange(
      simplifiedTitle,
      category
    );

    /* ===== BRAND / SELLER INTEL ===== */

    const brandIntel = productInfo.brand
      ? await analyzeBrand(productInfo.brand)
      : null;

    const sellerIntel = await analyzeSeller({
      seller: productInfo.seller,
      platform: productInfo.platform,
    });

    /* ===== PRICE / QUALITY ===== */

    const numericPrice = productInfo.price
      ? parseFloat(productInfo.price.replace("$", ""))
      : null;

    const pricePosition = classifyPrice(numericPrice, market);

    let qualitySignal =
      pricePosition === "reasonable"
        ? "normal"
        : pricePosition === "suspiciously_low"
        ? "low"
        : "questionable";

    /* ===== RELATIONSHIP ===== */

    const brandSellerRelation = brandSellerRelationship(
      productInfo.brand,
      productInfo.seller
    );

    /* ===== SCORING ===== */

    const productTrustScore = clampScore(
      !brandIntel?.exists
        ? 2
        : brandIntel.signals?.complaints
        ? 1
        : 4,
      3
    );

    let sellerTrustScore =
      !sellerIntel?.exists
        ? 2
        : sellerIntel.signals?.complaints
        ? 1
        : 4;

    if (brandSellerRelation === "mismatch") sellerTrustScore = 1;
    if (pricePosition !== "reasonable") sellerTrustScore -= 1;

    sellerTrustScore = clampScore(sellerTrustScore, 2);

    const websiteTrust = scoreWebsite(
      productInfo.platform,
      sellerIntel?.signals
    );

    const overallScore = clampScore(
      (productTrustScore +
        sellerTrustScore +
        websiteTrust.score +
        (categoryFits === false ? 1 : 4)) /
        4,
      2
    );

    /* ===== RESULT ===== */

    return new Response(
      JSON.stringify({
        aiResult: {
          title: productInfo.title,
          category,
          categoryFits,
          market,
          pricePosition,
          qualitySignal,
          brandSellerRelation,

          integrations: {
            openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
            braveConfigured: isBraveConfigured(),
          },

          websiteTrust,
          sellerTrust: {
            score: sellerTrustScore,
            reason:
              sellerIntel?.summary ||
              "Limited seller information available.",
          },
          productTrust: {
            score: productTrustScore,
            reason:
              brandIntel?.summary ||
              "No independent brand information found.",
          },
          overall: {
            score: overallScore,
            reason:
              overallScore <= 2
                ? "High risk based on multiple negative signals."
                : overallScore === 3
                ? "Mixed signals. Manual verification recommended."
                : "Trust signals are generally positive.",
          },
          status: overallScore <= 2 ? "bad" : "good",
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
