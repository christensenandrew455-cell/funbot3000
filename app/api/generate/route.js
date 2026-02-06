export const runtime = "nodejs";

import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  getSearchSnippets,
  aiScaleReputation,
  getMarketPrice,
} from "./search.js";

function brandSellerMismatch(brand, seller) {
  if (!brand || !seller) return false;
  if (seller.toLowerCase().includes("amazon")) return false;
  return !seller.toLowerCase().includes(brand.toLowerCase());
}

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
    const marketPrice = simplifiedTitle
      ? await getMarketPrice(simplifiedTitle)
      : null;

    const brandText = productInfo.brand
      ? await getSearchSnippets(
          `"${productInfo.brand}" reviews reputation trust scam`
        )
      : null;

    const sellerText = productInfo.seller
      ? await getSearchSnippets(
          `"${productInfo.seller}" amazon seller reviews complaints`
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

    const aiResult = {
      title: productInfo.title,
      market: { simplifiedTitle, marketPrice },

      productTrust: {
        score: brandScore ?? 2,
        reason: brandText
          ? "External brand reputation found."
          : "No external brand reputation found.",
      },

      sellerTrust: {
        score: mismatch ? 1 : sellerScore ?? 2,
        reason: mismatch
          ? "Seller does not match brand (dropship signal)."
          : sellerText
          ? "External seller reputation found."
          : "No seller reputation found.",
      },

      status:
        mismatch ||
        (brandScore !== null && brandScore <= 2) ||
        (sellerScore !== null && sellerScore <= 2)
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
