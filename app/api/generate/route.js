export const runtime = "nodejs";

import { OpenAI } from "openai";
import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  analyzeBrand,
  analyzeSeller,
  isBraveConfigured,
} from "./search.js";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/* ===================== HELPERS ===================== */

function safeJSONParse(text, fallback = {}) {
  try {
    const match = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .match(/\{[\s\S]*\}/);
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

function brandSellerMismatch(brand, seller) {
  if (!brand || !seller) return false;
  if (seller.toLowerCase().includes("amazon")) return false;
  return !seller.toLowerCase().includes(brand.toLowerCase());
}

function classifyPrice(price, market) {
  if (!price || !market) return "unknown";
  if (price < market.median * 0.7) return "suspiciously_low";
  if (price > market.median * 1.3) return "suspiciously_high";
  return "reasonable";
}

function clampScore(score, fallback = 2) {
  if (typeof score !== "number" || Number.isNaN(score)) return fallback;
  return Math.max(1, Math.min(5, Math.round(score)));
}

/* ===================== AI HELPERS ===================== */

async function aiInferCategory(simplifiedTitle) {
  if (!simplifiedTitle) return null;

  const openai = getOpenAIClient();
  if (!openai) return null;

  const prompt = `
Given the product name below, determine the most appropriate product category.

Product:
${simplifiedTitle}

Return JSON ONLY:
{ "category": string }
`;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const parsed = safeJSONParse(getResponseText(res), {});
  return typeof parsed.category === "string" ? parsed.category : null;
}

async function getMarketPriceRange(productTitle, category = null) {
  if (!productTitle) return null;

  const openai = getOpenAIClient();
  if (!openai) return null;

  const prompt = `
Estimate the typical online market price range for the product below.
Assume common retailers (Amazon, Walmart, Target, etc).
Do NOT guess extreme values.

Product:
${productTitle}
Category:
${category || "unknown"}

Return JSON ONLY:
{
  "min": number,
  "max": number,
  "median": number
}
`;

  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: prompt,
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

function scoreWebsiteByPlatform(platform) {
  if (!platform) {
    return { score: 2, reason: "Website platform could not be identified." };
  }

  if (platform.includes("amazon")) {
    return {
      score: 5,
      reason: "Amazon is a well-established and trusted ecommerce platform.",
    };
  }

  return {
    score: 2,
    reason:
      "This website is not a widely recognized ecommerce platform. Proceed with caution.",
  };
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

    const category = simplifiedTitle
      ? await aiInferCategory(simplifiedTitle)
      : null;

    const market =
      simplifiedTitle && category
        ? await getMarketPriceRange(simplifiedTitle, category)
        : null;

    /* ===================== BRAND / SELLER INTEL ===================== */

    const brandIntel = await analyzeBrand(
      productInfo.brand || simplifiedTitle
    );

    const sellerIntel = await analyzeSeller({
      seller: productInfo.seller,
      platform: productInfo.platform,
    });

    /* ===================== PRICE SIGNAL ===================== */

    const numericPrice = productInfo.price
      ? parseFloat(productInfo.price.replace("$", ""))
      : null;

    const pricePosition = classifyPrice(numericPrice, market);

    const mismatch = brandSellerMismatch(
      productInfo.brand,
      productInfo.seller
    );

    /* ===================== SCORING ===================== */

    // PRODUCT / BRAND TRUST
    const productTrustScore = clampScore(
      !brandIntel?.exists
        ? 1
        : brandIntel.signals?.complaints
        ? 1
        : 3,
      2
    );

    // SELLER TRUST
    let sellerTrustScore = !sellerIntel?.exists
      ? 2
      : sellerIntel.signals?.complaints
      ? 1
      : 3;

    if (pricePosition !== "reasonable") sellerTrustScore -= 1;
    if (mismatch) sellerTrustScore = 1;

    sellerTrustScore = clampScore(sellerTrustScore, 2);

    const websiteTrust = scoreWebsiteByPlatform(productInfo.platform);

    const overallScore = clampScore(
      Math.round(
        (productTrustScore +
          sellerTrustScore +
          websiteTrust.score) / 3
      ),
      2
    );

    /* ===================== RESULT ===================== */

    const aiResult = {
      title: productInfo.title,
      category,
      market,
      pricePosition,

      integrations: {
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        braveConfigured: isBraveConfigured(),
      },

      websiteTrust,

      sellerTrust: {
        score: sellerTrustScore,
        reason: sellerIntel?.summary ||
          "Limited seller information available.",
      },

      productTrust: {
        score: productTrustScore,
        reason: brandIntel?.summary ||
          "No independent brand information found.",
      },

      overall: {
        score: overallScore,
        reason:
          overallScore <= 2
            ? "Multiple trust signals indicate a high risk of scam."
            : overallScore === 3
            ? "Mixed trust signals. Verify seller and brand carefully."
            : "Trust signals look healthy based on available data.",
      },

      status:
        overallScore <= 2 ||
        sellerTrustScore <= 2 ||
        productTrustScore <= 2
          ? "bad"
          : "good",
    };

    return new Response(JSON.stringify({ aiResult }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
