// app/api/generate/route.js
import { OpenAI } from "openai";
import { extractFromHTML } from "./extract";
import { runAllSearches } from "./search";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function gpt(prompt) {
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

function clampScore(value, max = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const hi = Number.isFinite(max) ? Math.max(0, Math.min(5, max)) : 5;
  return Math.max(0, Math.min(hi, Math.round(n)));
}

function cleanReason(v) {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s : null;
}

function fallbackReason(area) {
  if (area === "Website Trust")
    return "This is a well-known shopping site with standard checkout and buyer protections. No additional site-specific issues were identified from the available inputs.";
  if (area === "Seller Trust")
    return "There was not enough seller-specific information to verify reputation. The rating reflects limited seller evidence from the available inputs.";
  if (area === "Product Trust")
    return "There was not enough brand-specific information to verify long-term quality. The rating reflects limited product evidence from the available inputs.";
  return "Information was limited. The rating reflects the available context.";
}

function hasNoClearInfo(v) {
  return (
    typeof v === "string" &&
    v.trim().toLowerCase() === "no clear information found."
  );
}

function isPresent(v) {
  return !(v === null || v === undefined || String(v).trim() === "");
}

/* ===================== GPT DECISION: AREA RATER ===================== */
/* GPT DECIDES SCORE + REASON USING ONLY THE PROVIDED INPUTS */

async function rateArea({
  area,
  inputs,
  strictFallbackScore = 3,
  maxScore = 5,
}) {
  const entries = Object.entries(inputs || {}).map(([k, v]) => {
    const val =
      v === null || v === undefined || v === "" ? "null" : String(v).trim();
    return `- ${k}: ${val}`;
  });

  const text = await gpt(`
You are rating an ecommerce listing.

IMPORTANT RULES:
- You must decide the score yourself (do NOT say "already decided").
- Use ONLY the inputs below plus general knowledge. Do not invent additional facts.
- Be neutral and factual. No fear language and no absolutes.
- Output MUST be JSON only, with the exact keys shown.
- "reason" MUST be exactly TWO short sentences.
- Write the reason like you're explaining facts to a shopper (plain English).
- Do NOT mention input field names (e.g., do not say "sellerData", "productPriceData", "brandPriceData", etc.).
- Avoid vague phrases like "feedback is mixed" unless you state what the mixed points are.
- If evidence is missing (nulls or "No clear information found."), explicitly say what could not be verified.

AREA: ${area}

INPUTS:
${entries.length ? entries.join("\n") : "- (none)"}

Return JSON only:
{
  "score": 1-5 integer,
  "reason": "Two short sentences in plain English."
}
`);

  const parsed = safeJSON(text, null);
  const score = clampScore(parsed?.score, maxScore);
  const reason = cleanReason(parsed?.reason);

  return {
    score: score || Math.min(strictFallbackScore, maxScore),
    reason: reason || fallbackReason(area),
  };
}

/* ===================== GPT DECISION: OVERALL ===================== */

async function rateOverall({ title, websiteTrust, sellerTrust, productTrust }) {
  const text = await gpt(`
You are producing an overall rating for an ecommerce listing based ONLY on the component results below.

IMPORTANT RULES:
- Decide status + score yourself.
- Be neutral and factual. No fear language and no absolutes.
- Output MUST be JSON only with the exact keys shown.
- "reason" MUST be exactly TWO short sentences.
- Do NOT restate the numeric scores in the reason. Explain the top 1–2 drivers instead.
- Write in plain English for a shopper.
- Status MUST be one of: "scam", "untrustworthy", "overpriced", "good product"

TITLE: ${title || "unknown"}

COMPONENTS:
- Website Trust: ${websiteTrust?.score ?? "null"}/5 — ${websiteTrust?.reason ?? "null"}
- Seller Trust: ${sellerTrust?.score ?? "null"}/5 — ${sellerTrust?.reason ?? "null"}
- Product Trust: ${productTrust?.score ?? "null"}/5 — ${productTrust?.reason ?? "null"}

Return JSON only:
{
  "status": "scam|untrustworthy|overpriced|good product",
  "score": 1-5 integer,
  "meaning": "2-5 words (e.g., 'Avoid', 'Quality concerns', 'Safe but poor value', 'Solid value')",
  "reason": "Two short factual sentences."
}
`);

  const parsed = safeJSON(text, null);

  const statusRaw = typeof parsed?.status === "string" ? parsed.status.trim() : "";
  const allowed = new Set(["scam", "untrustworthy", "overpriced", "good product"]);
  const status = allowed.has(statusRaw) ? statusRaw : "good product";

  return {
    status,
    score: clampScore(parsed?.score) || 3,
    meaning: cleanReason(parsed?.meaning) || "Mixed signals",
    reason:
      cleanReason(parsed?.reason) ||
      "Signals were mixed across the website, seller, and product context. The overall rating reflects the strongest available drivers.",
  };
}

/* ===================== CORE LOGIC ===================== */

async function buildAiResult(extracted, analyses) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData, // kept in analyses for other uses, but NOT fed into product trust
    productProblemsData,
  } = analyses || {};

  const title = extracted.brandSimple || extracted.product || "Unknown Product";

  // Evidence flags (used to force the model to acknowledge missing info)
  const evidence = {
    hasSellerEvidence:
      isPresent(extracted.seller) && !hasNoClearInfo(sellerData || ""),
    hasPriceEvidence: isPresent(extracted.price),
    hasBrandPriceEvidence: !hasNoClearInfo(brandPriceData || ""),
    hasBrandEvidence: !hasNoClearInfo(productData || ""),
    hasBrandProblemsEvidence: !hasNoClearInfo(productProblemsData || ""),
    hasCategoryPriceEvidence: !hasNoClearInfo(productPriceData || ""),
  };

  // Website rated from: domain + GPT general knowledge
  const websiteTrust = await rateArea({
    area: "Website Trust",
    inputs: {
      domain: extracted.domain ?? null,
    },
    strictFallbackScore: 3,
    maxScore: 5,
  });

  // Seller Trust: ONLY seller-specific signals (+ optional pricing vs the brand's typical pricing)
  // If we have no seller evidence at all, cap the score lower.
  const sellerMaxScore = evidence.hasSellerEvidence ? 5 : 2;

  const sellerTrust = await rateArea({
    area: "Seller Trust",
    inputs: {
      seller: extracted.seller ?? null,
      sellerMatchesBrand: extracted.sellerMatchesBrand ?? "no",
      sellerInfo: sellerData ?? null,
      listingPrice: extracted.price ?? null,
      typicalBrandPrice: brandPriceData ?? null,
      sellerEvidenceFound: evidence.hasSellerEvidence ? "yes" : "no",
      priceEvidenceFound:
        evidence.hasPriceEvidence && evidence.hasBrandPriceEvidence ? "yes" : "no",
    },
    strictFallbackScore: 3,
    maxScore: sellerMaxScore,
  });

  // Product Trust: ONLY brand/product quality signals (NO category-price data, no seller data)
  // If brand-specific info is missing, treat as unknown brand and cap score.
  const productHasBrandSignals =
    evidence.hasBrandEvidence || evidence.hasBrandProblemsEvidence;
  const productMaxScore = productHasBrandSignals ? 5 : 2;

  const productTrust = await rateArea({
    area: "Product Trust",
    inputs: {
      brand: extracted.brandSimple ?? null,
      productType: extracted.product ?? null,
      brandOverview: productData ?? null,
      commonComplaints: productProblemsData ?? null,
      brandEvidenceFound: productHasBrandSignals ? "yes" : "no",
    },
    strictFallbackScore: 3,
    maxScore: productMaxScore,
  });

  // Overall decided by GPT from component results
  const overall = await rateOverall({
    title,
    websiteTrust,
    sellerTrust,
    productTrust,
  });

  return {
    status: overall.status,
    title,
    websiteTrust,
    sellerTrust,
    productTrust,
    overall: {
      score: overall.score,
      meaning: overall.meaning,
      reason: overall.reason,
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

    const analyses = await runAllSearches({
      seller: extracted.seller,
      brandSimple: extracted.brandSimple,
      product: extracted.product,
    });

    if (!analyses) {
      return Response.json(
        { error: "Search is not configured or failed." },
        { status: 500 }
      );
    }

    const aiResult = await buildAiResult(extracted, analyses);

    return Response.json({ aiResult, extracted });
  } catch {
    return Response.json({ error: "Request failed." }, { status: 500 });
  }
}
