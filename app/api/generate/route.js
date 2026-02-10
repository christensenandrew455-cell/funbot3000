export const runtime = "nodejs";

import { OpenAI } from "openai";
import { extractFromHTML, simplifyTitle } from "./extract.js";
import {
  searchBrandEvidence,
  searchSellerEvidence,
  isSearchConfigured,
} from "./search.js";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ===================== HELPERS ===================== */

function safeJSON(text, fallback = null) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch {
    return fallback;
  }
}

function clamp(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}

/* ===================== PRICE ===================== */

function classifyPrice(price, market) {
  if (!price || !market) return "unknown";
  if (price < market.median * 0.75) return "low";
  if (price > market.median * 1.35) return "high";
  return "fair";
}

/* ===================== AI ===================== */

async function aiCategory(name) {
  const openai = getClient();
  if (!openai) return null;

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Infer a retail category.

Product:
${name}

Return JSON only: { "category": string }
`,
  });

  return safeJSON(r.output_text)?.category || null;
}

async function aiMarketPrice(name, category) {
  const openai = getClient();
  if (!openai) return null;

  const r = await openai.responses.create({
    model: "gpt-5-nano",
    input: `
Estimate typical online pricing.

Product: ${name}
Category: ${category}

Return JSON only:
{ "min": number, "max": number, "median": number }
`,
  });

  return safeJSON(r.output_text);
}

async function aiEntity(name, evidence) {
  const openai = getClient();
  if (!openai) return null;

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Evaluate entity using ONLY evidence.

Name: ${name}
Evidence: ${evidence || "None"}

Return JSON:
{
  "exists": boolean,
  "positive": boolean,
  "negative": boolean,
  "summary": string
}
`,
  });

  return safeJSON(r.output_text);
}

/* ===================== WEBSITE ===================== */

function websiteTrust(platform) {
  if (!platform) return { score: 3, reason: "Unknown platform." };

  if (platform.includes("amazon")) {
    return {
      score: 4,
      reason: "Large marketplace; trust depends on individual seller.",
    };
  }

  return { score: 3, reason: "Independent website with limited data." };
}

/* ===================== ROUTE ===================== */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return Response.json({ error: "Missing URL" }, { status: 400 });

    const product = await extractFromHTML(url);
    if (!product?.title)
      return Response.json({ error: "Extraction failed" }, { status: 400 });

    const title = simplifyTitle(product.title);
    const category = await aiCategory(title);
    const market = await aiMarketPrice(title, category);

    const price = product.price
      ? parseFloat(product.price.replace("$", ""))
      : null;

    const pricePosition = classifyPrice(price, market);

    const brandEvidence = product.brand
      ? await searchBrandEvidence(product.brand)
      : null;

    const sellerEvidence = await searchSellerEvidence(product);

    const brandIntel = await aiEntity(product.brand, brandEvidence);
    const sellerIntel = await aiEntity(product.seller, sellerEvidence);

    const productScore = clamp(
      brandIntel?.negative ? 2 : brandIntel?.positive ? 4 : 3
    );

    const sellerScore = clamp(
      sellerIntel?.negative
        ? 2
        : pricePosition === "low"
        ? 3
        : 4
    );

    const website = websiteTrust(product.platform);

    const overall = clamp(
      (productScore + sellerScore + website.score) / 3
    );

    return Response.json({
      aiResult: {
        title: product.title,
        category,
        market,
        pricePosition,
        qualitySignal:
          pricePosition === "low"
            ? "uncertain"
            : pricePosition === "fair"
            ? "matched"
            : "questionable",

        websiteTrust: website,
        sellerTrust: {
          score: sellerScore,
          reason: sellerIntel?.summary || "Limited seller data.",
        },
        productTrust: {
          score: productScore,
          reason: brandIntel?.summary || "Limited brand data.",
        },

        overall: {
          score: overall,
          status: overall <= 2 ? "bad" : "good",
          reason:
            overall <= 2
              ? "Value or trust mismatch detected."
              : "Price and quality appear reasonably aligned.",
        },

        integrations: {
          openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
          searchConfigured: isSearchConfigured(),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
