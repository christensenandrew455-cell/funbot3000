export const runtime = "nodejs";

import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  getSearchSnippets,
  aiScaleReputation,
  getMarketPriceRange,
  aiInferCategory,
} from "./search.js";

/* ===================== HELPERS ===================== */

function isBraveConfigured() {
  return Boolean(process.env.BRAVE_API_KEY);
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

    const brandText = productInfo.brand
      ? await getSearchSnippets(
          `"${productInfo.brand}" reviews company information`
        )
      : null;

    const sellerText = productInfo.seller
      ? await getSearchSnippets(
          `"${productInfo.seller}" seller reviews business information`
        )
      : null;

    const brandScore = brandText
      ? await aiScaleReputation(brandText, "brand")
      : null;

    const sellerScore = sellerText
      ? await aiScaleReputation(sellerText, "seller")
      : null;

    const mismatch = brandSellerMismatch(
      productInfo.brand,
      productInfo.seller
    );

    const numericPrice = productInfo.price
      ? parseFloat(productInfo.price.replace("$", ""))
      : null;

    const pricePosition = classifyPrice(numericPrice, market);

    /* ===================== SCORES ===================== */

    const productTrustScore = clampScore(brandScore, 2);

    let adjustedSellerScore = sellerScore ?? 2;
    if (pricePosition === "suspiciously_low") adjustedSellerScore -= 1;
    if (pricePosition === "suspiciously_high") adjustedSellerScore -= 1;
    if (mismatch) adjustedSellerScore = 1;

    const sellerTrustScore = clampScore(adjustedSellerScore, 2);

    const websiteTrust = scoreWebsiteByPlatform(productInfo.platform);

    const overallScore = clampScore(
      Math.round(
        (productTrustScore +
          sellerTrustScore +
          websiteTrust.score) /
          3
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
        reason:
          pricePosition === "suspiciously_low"
            ? "Seller pricing is unusually low, often associated with low-quality or misleading listings."
            : pricePosition === "suspiciously_high"
            ? "Seller pricing is significantly higher than comparable listings."
            : mismatch
            ? "Seller does not appear to be the original brand."
            : sellerText
            ? "External seller information found."
            : "Limited seller information available.",
      },

      productTrust: {
        score: productTrustScore,
        reason: brandText
          ? "External brand information found."
          : "No external brand information found.",
      },

      overall: {
        score: overallScore,
        reason:
          overallScore <= 2
            ? "Multiple trust signals are weak. Proceed with caution."
            : overallScore === 3
            ? "Mixed trust signals. Verify seller details."
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
