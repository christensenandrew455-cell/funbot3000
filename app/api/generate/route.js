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

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function cleanReason(v) {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s : null;
}

function fallbackReason(area) {
  if (area === "Website Trust")
    return "Domain information was available, but no clear additional signals were provided. Rating is based on general knowledge only.";
  if (area === "Seller Trust")
    return "Seller context was limited or unclear. Rating is based on the provided seller/brand relationship and general knowledge only.";
  if (area === "Product Trust")
    return "Product context was limited or unclear. Rating is based on the provided product information and general knowledge only.";
  return "Information was limited. Rating is based on available context only.";
}

/* ===================== GPT DECISION: AREA RATER ===================== */
/* GPT DECIDES SCORE + REASON USING ONLY THE PROVIDED INPUTS */

async function rateArea({ area, inputs, strictFallbackScore = 3 }) {
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
- "reason" MUST be exactly TWO short factual sentences.

AREA: ${area}

INPUTS:
${entries.length ? entries.join("\n") : "- (none)"}

Return JSON only:
{
  "score": 1-5 integer,
  "reason": "Two short factual sentences."
}
`);

  const parsed = safeJSON(text, null);
  const score = clampScore(parsed?.score);
  const reason = cleanReason(parsed?.reason);

  return {
    score: score || strictFallbackScore,
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
- "reason" MUST be exactly TWO short factual sentences.
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
      "Component signals were mixed. The overall rating reflects the available evidence.",
  };
}

/* ===================== CORE LOGIC ===================== */

async function buildAiResult(extracted, analyses) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData,
    productProblemsData,
  } = analyses || {};

  const title = extracted.brandSimple || extracted.product || "Unknown Product";

  // Website rated from: domain + GPT general knowledge
  const websiteTrust = await rateArea({
    area: "Website Trust",
    inputs: {
      domain: extracted.domain ?? null,
    },
    strictFallbackScore: 3,
  });

  // Seller rated from: sellerMatchesBrand + sellerData + price against brandPriceData
  const sellerTrust = await rateArea({
    area: "Seller Trust",
    inputs: {
      sellerMatchesBrand: extracted.sellerMatchesBrand ?? "no",
      sellerData: sellerData ?? null,
      price: extracted.price ?? null,
      brandPriceData: brandPriceData ?? null,
    },
    strictFallbackScore: 3,
  });

  // Product rated from: productData + productPriceData + productProblemsData
  const productTrust = await rateArea({
    area: "Product Trust",
    inputs: {
      productData: productData ?? null,
      productPriceData: productPriceData ?? null,
      productProblemsData: productProblemsData ?? null,
    },
    strictFallbackScore: 3,
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
