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

    const aiResult = {
      title: productInfo.title,
      category,
      market,
      pricePosition,

      productTrust: {
        score: brandScore ?? 2,
        reason: brandText
          ? "External brand information found."
          : "No external brand information found.",
      },

      sellerTrust: {
        score: mismatch ? 1 : sellerScore ?? 2,
        reason: mismatch
          ? "Seller does not match brand (dropship signal)."
          : sellerText
          ? "External seller information found."
          : "No seller information found.",
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
