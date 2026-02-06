export const runtime = "nodejs";

import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  getSearchSnippets,
  aiScaleReputation,
  getMarketPriceRange,
  aiInferCategory,
} from "./search.js";

function brandSellerMismatch(brand, seller) {
  if (!brand || !seller) return false;
  if (seller.toLowerCase().includes("amazon")) return false;
  return !seller.toLowerCase().includes(brand.toLowerCase());
}

function classifyPrice(price, market) {
  if (!price || !market) return "unknown";
  if (price < market.min * 0.8) return "underpriced";
  if (price > market.max * 1.2) return "overpriced";
  return "normal";
}

function clampScore(score, fallback = 2) {
  if (typeof score !== "number" || Number.isNaN(score)) return fallback;
  return Math.max(1, Math.min(5, Math.round(score)));
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    console.log("[ROUTE] URL:", url);

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    const productInfo = await extractFromHTML(url);
    console.log("[EXTRACT]", productInfo);

    if (!productInfo?.title) {
      return new Response(
        JSON.stringify({ error: "Failed to extract product" }),
        { status: 400 }
      );
    }

    const simplifiedTitle = simplifyTitle(productInfo.title);
    console.log("[SIMPLIFIED TITLE]", simplifiedTitle);

    const category = simplifiedTitle
      ? await aiInferCategory(simplifiedTitle)
      : null;

    console.log("[CATEGORY]", category);

    const market = simplifiedTitle
      ? await getMarketPriceRange(simplifiedTitle)
      : null;

    console.log("[MARKET RANGE]", market);

    const brandText = productInfo.brand
      ? await getSearchSnippets(
          `"${productInfo.brand}" about reviews company information`
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

    const pricePosition = classifyPrice(
      productInfo.price ? parseFloat(productInfo.price.replace("$", "")) : null,
      market
    );

    console.log("[PRICE POSITION]", pricePosition);
    console.log("[BRAND SCORE]", brandScore);
    console.log("[SELLER SCORE]", sellerScore);
    console.log("[MISMATCH]", mismatch);

        const productTrustScore = clampScore(brandScore, 2);
    const sellerTrustScore = clampScore(mismatch ? 1 : sellerScore, mismatch ? 1 : 2);

    const websiteTrustScore = clampScore(
      (() => {
        if (pricePosition === "underpriced") return 2;
        if (pricePosition === "overpriced") return 2;
        if (pricePosition === "normal") return 4;
        return 3;
      })(),
      3
    );

    const overallScore = clampScore(
      Math.round((productTrustScore + sellerTrustScore + websiteTrustScore) / 3),
      2
    );

    const aiResult = {
      title: productInfo.title,
      category,
      market,
      pricePosition,
      integrations: {
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        braveConfigured: Boolean(process.env.BRAVE_API_KEY),
      },

      websiteTrust: {
        score: websiteTrustScore,
        reason:
          pricePosition === "underpriced"
            ? "Price is much lower than market baseline, which can be a scam signal."
            : pricePosition === "overpriced"
            ? "Price is above the market range and may indicate poor value."
            : pricePosition === "normal"
            ? "Price appears within normal market range."
            : "Not enough pricing data to judge website trust confidently.",
      },
      
      productTrust: {
        score: productTrustScore,
        reason: brandText
          ? "External brand information found."
          : "No external brand information found.",
      },

      sellerTrust: {
        score: sellerTrustScore,
        reason: mismatch
          ? "Seller does not match brand (dropship signal)."
          : sellerText
          ? "External seller information found."
          : "No seller information found.",
      },

            overall: {
        score: overallScore,
        reason:
          overallScore <= 2
            ? "Multiple trust signals are weak. Proceed with caution."
            : overallScore === 3
            ? "Mixed signals. Verify seller and pricing before purchase."
            : "Trust signals look healthy based on available data.",
      },

      status:
        mismatch ||
        pricePosition === "overpriced" ||
        (brandScore !== null && brandScore <= 2) ||
        (sellerScore !== null && sellerScore <= 2)
          ? "bad"
          : "good",
    };

    console.log("[FINAL RESULT]", aiResult);

    return new Response(JSON.stringify({ aiResult }), { status: 200 });
  } catch (err) {
    console.error("[ROUTE ERROR]", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
