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

function getEntityScore(intel, fallback = 3) {
  if (!intel) return fallback;
  if (intel.positive && !intel.negative) return 4;
  if (intel.negative && !intel.positive) return 2;
  if (intel.positive && intel.negative) return 3;
  return fallback;
}

function signalText(flags) {
  const active = flags.filter(Boolean);
  if (!active.length) return "No concrete listing details were available.";
  return `Signals used: ${active.join(", ")}.`;
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

Return JSON only:
{ "category": string }
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

async function aiEntity(name, evidence, context = "") {
  const openai = getClient();
  if (!openai) return null;

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Evaluate this entity using reasoning.

Entity name: ${name}

Context:
${context || "None"}

Evidence:
${evidence || "None"}

Consider:
- legitimacy and reputation
- alignment with brand / platform if applicable
- consistency (e.g. brand vs seller mismatch)
- common consumer risk patterns

Return JSON only:
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

async function aiCategoryFit(product, category) {
  const openai = getClient();
  if (!openai) return null;

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Evaluate product suitability.

Product: ${product}
Category: ${category}

Is this product commonly appropriate,
useful, and expected for this category?

Return JSON only:
{
  "appropriate": boolean,
  "summary": string
}
`,
  });

  return safeJSON(r.output_text);
}

async function aiWebsiteTrust(platform) {
  const openai = getClient();
  if (!openai) return { score: 3, reason: "Unknown platform." };

  const r = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
Evaluate website trustworthiness.

Domain: ${platform}

Consider:
- general reputation
- marketplace vs independent store
- consumer risk patterns

Return JSON only:
{
  "score": number,
  "reason": string
}
`,
  });

  return safeJSON(r.output_text) || { score: 3, reason: "Unknown platform." };
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
    const categoryFit = await aiCategoryFit(title, category);

    const market = await aiMarketPrice(title, category);

    const price = product.price
      ? parseFloat(product.price.replace("$", ""))
      : null;

    const pricePosition = classifyPrice(price, market);

    const brandEvidence = product.brand
      ? await searchBrandEvidence(product.brand)
      : null;

    const sellerEvidence = await searchSellerEvidence(product);

    const sellerContext = `
Brand: ${product.brand || "unknown"}
Seller: ${product.seller || "unknown"}
Platform: ${product.platform}
Price position: ${pricePosition}
`;

    const brandIntel = await aiEntity(product.brand, brandEvidence);
    const sellerIntel = await aiEntity(
      product.seller || product.platform,
      sellerEvidence,
      sellerContext
    );

    const website = await aiWebsiteTrust(product.platform);

    const productScore = clamp(getEntityScore(brandIntel));
    const sellerScore = clamp(getEntityScore(sellerIntel));

    const informationCoverageBoost =
      (product.brand ? 0.2 : 0) +
      (product.seller ? 0.2 : 0) +
      (price ? 0.2 : 0);

    const overall = clamp(
      productScore * 0.35 +
        sellerScore * 0.35 +
        website.score * 0.3 +
        informationCoverageBoost
    );

    const overallReason = [
      `Website trust: ${website.score}/5.`,
      `Seller trust: ${sellerScore}/5.`,
      `Product/brand trust: ${productScore}/5.`,
      `Price appears ${pricePosition} relative to market.`,
      categoryFit?.summary || null,
      signalText([
        product.brand ? "brand" : null,
        product.seller ? "seller" : null,
        price ? "price" : null,
        brandEvidence ? "brand evidence" : null,
        sellerEvidence ? "seller evidence" : null,
      ]),
    ]
      .filter(Boolean)
      .join(" ");

    return Response.json({
      aiResult: {
        title: product.title,
        category,
        categoryFit,
        market,
        pricePosition,

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
          reason: overallReason,
        },

        status: overall <= 2 ? "bad" : "good",

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
