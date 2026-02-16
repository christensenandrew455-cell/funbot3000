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

/* ===================== AMAZON LINKING (AFFILIATE) ===================== */
/**
 * Clean affiliate link format: https://www.amazon.com/dp/ASIN/ref=nosim?tag=YOURTAG
 * Amazon documents this exact pattern. :contentReference[oaicite:2]{index=2}
 */

function getAssociateTag() {
  return (process.env.AMAZON_ASSOCIATE_TAG || "").trim() || null;
}

function extractASINFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const path = u.pathname || "";

    const m =
      path.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i) ||
      path.match(/\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i) ||
      path.match(/\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i);

    if (m && m[1]) return m[1].toUpperCase();

    const asinQ = u.searchParams.get("asin") || u.searchParams.get("ASIN");
    if (asinQ && /^[A-Z0-9]{10}$/i.test(asinQ)) return asinQ.toUpperCase();

    return null;
  } catch {
    return null;
  }
}

function buildAmazonDpLink({ asin, marketplaceHost = "www.amazon.com" }) {
  if (!asin) return null;
  const tag = getAssociateTag();

  const base = `https://${marketplaceHost}/dp/${encodeURIComponent(asin)}/ref=nosim`;
  if (!tag) return base;
  return `${base}?tag=${encodeURIComponent(tag)}`;
}

function buildAmazonSearchLink({ query, marketplaceHost = "www.amazon.com" }) {
  if (!query) return null;
  const tag = getAssociateTag();

  const base = `https://${marketplaceHost}/s?k=${encodeURIComponent(query)}`;
  if (!tag) return base;
  return `${base}&tag=${encodeURIComponent(tag)}`;
}

/* ===================== GPT DECISION: AREA RATER ===================== */

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
- Do NOT mention input field names.
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

  const statusRaw =
    typeof parsed?.status === "string" ? parsed.status.trim() : "";
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

/* ===================== OVERALL GUARDRAILS (NO MISLABELING) ===================== */

function applyOverallGuardrails({ websiteTrust, sellerTrust, productTrust, overall }) {
  const w = Number(websiteTrust?.score ?? 0);
  const s = Number(sellerTrust?.score ?? 0);
  const p = Number(productTrust?.score ?? 0);

  if (s <= 2 || p <= 2) {
    return {
      status: "untrustworthy",
      score: Math.min(2, overall?.score || 2),
      meaning: "Trust too low",
      reason:
        "The seller or the product could not be verified strongly enough to recommend confidently. Use caution and verify seller identity, reviews, and return terms before buying.",
    };
  }

  const canBeGood = s >= 4 && p >= 4 && w >= 3;

  if (!canBeGood) {
    return {
      status: "overpriced",
      score: 3,
      meaning: "Ok, but not worth it",
      reason:
        "Trust signals are not strong enough to call this a clear win, even if nothing looks immediately wrong. Consider alternatives with stronger seller/product confidence for the price.",
    };
  }

  return {
    status: "good product",
    score: Math.max(4, overall?.score || 4),
    meaning: overall?.meaning || "Solid value",
    reason:
      overall?.reason ||
      "Seller and product signals were consistently strong compared with typical listings. The overall rating reflects that the key trust checks looked good.",
  };
}

/* ===================== SUGGESTED PRODUCTS (3-TIER) ===================== */

function valueScoreFromTier(tier) {
  if (tier === "low") return 72;
  if (tier === "mid") return 84;
  return 93;
}

function qualityScoreFromTier(tier) {
  if (tier === "low") return 58;
  if (tier === "mid") return 76;
  return 90;
}

function tierMeta(tier) {
  if (tier === "low") {
    return {
      tier,
      label: "Budget pick",
      badge: "GOOD VALUE",
      tagline:
        "Lowest upfront cost while still aiming for a solid value-per-dollar.",
    };
  }
  if (tier === "mid") {
    return {
      tier,
      label: "Best bang for buck",
      badge: "BEST VALUE",
      tagline:
        "The balanced option: strong value without jumping to the highest price.",
    };
  }
  return {
    tier,
    label: "Premium value",
    badge: "TOP VALUE",
    tagline:
      "Higher price, but typically the strongest overall value if you want the best option.",
  };
}

function buildSuggested({ brandSimple, productType, marketplaceHost }) {
  const baseQuery = [brandSimple, productType].filter(Boolean).join(" ").trim();
  const q = baseQuery || "amazon product";

  const tiers = ["low", "mid", "high"];

  return tiers.map((tier) => {
    const meta = tierMeta(tier);

    const tierQuery =
      tier === "low"
        ? `${q} best value`
        : tier === "mid"
          ? `${q} top rated value`
          : `${q} premium best`;

    return {
      ...meta,
      title: `${meta.label}: ${q}`,
      link:
        buildAmazonSearchLink({ query: tierQuery, marketplaceHost }) ||
        buildAmazonSearchLink({ query: q, marketplaceHost }),
      displayPrice: null,
      valueScore: valueScoreFromTier(tier),
      qualityScore: qualityScoreFromTier(tier),
      valueNote:
        "Value score is a quick guide. Actual pricing and availability are on Amazon.",
    };
  });
}

/* ===================== CORE LOGIC ===================== */

async function buildAiResult(extracted, analyses, originalUrl) {
  const {
    sellerData,
    productData,
    brandPriceData,
    productPriceData,
    productProblemsData,
    categoryProblemsData,
  } = analyses || {};

  const title = extracted.brandSimple || extracted.product || "Unknown Product";

  const evidence = {
    hasSellerEvidence:
      isPresent(extracted.seller) && !hasNoClearInfo(sellerData || ""),
    hasPriceEvidence: Number.isFinite(extracted.priceValue),
    hasBrandPriceEvidence: !hasNoClearInfo(brandPriceData || ""),
    hasBrandEvidence: !hasNoClearInfo(productData || ""),
    hasBrandProblemsEvidence: !hasNoClearInfo(productProblemsData || ""),
    hasCategoryProblemsEvidence: !hasNoClearInfo(categoryProblemsData || ""),
    hasCategoryPriceEvidence: !hasNoClearInfo(productPriceData || ""),
  };

  const websiteTrust = await rateArea({
    area: "Website Trust",
    inputs: {
      domain: extracted.domain ?? null,
    },
    strictFallbackScore: 3,
    maxScore: 5,
  });

  const sellerMaxScore = evidence.hasSellerEvidence ? 5 : 2;

  const sellerTrust = await rateArea({
    area: "Seller Trust",
    inputs: {
      seller: extracted.seller ?? null,
      sellerMatchesBrand: extracted.sellerMatchesBrand ?? "no",
      sellerInfo: sellerData ?? null,
      listingPrice: Number.isFinite(extracted.priceValue) ? extracted.priceValue : null,
      typicalBrandPrice: brandPriceData ?? null,
      sellerEvidenceFound: evidence.hasSellerEvidence ? "yes" : "no",
      priceEvidenceFound:
        evidence.hasPriceEvidence && evidence.hasBrandPriceEvidence ? "yes" : "no",
    },
    strictFallbackScore: 3,
    maxScore: sellerMaxScore,
  });

  const productHasBrandSignals =
    evidence.hasBrandEvidence || evidence.hasBrandProblemsEvidence;
  const productMaxScore = productHasBrandSignals ? 5 : 2;

  const productTrust = await rateArea({
    area: "Product Trust",
    inputs: {
      brand: extracted.brandSimple ?? null,
      productType: extracted.product ?? null,
      brandOverview: productData ?? null,
      brandComplaints: productProblemsData ?? null,
      categoryComplaints: categoryProblemsData ?? null,
      brandEvidenceFound: productHasBrandSignals ? "yes" : "no",
      categoryEvidenceFound: evidence.hasCategoryProblemsEvidence ? "yes" : "no",
    },
    strictFallbackScore: 3,
    maxScore: productMaxScore,
  });

  const overallRaw = await rateOverall({
    title,
    websiteTrust,
    sellerTrust,
    productTrust,
  });

  const overall = applyOverallGuardrails({
    websiteTrust,
    sellerTrust,
    productTrust,
    overall: overallRaw,
  });

  const marketplaceHost = "www.amazon.com";

  const asin = extractASINFromUrl(originalUrl);
  const primaryLink =
    buildAmazonDpLink({ asin, marketplaceHost }) ||
    buildAmazonSearchLink({ query: title, marketplaceHost });

  const suggested =
    overall.status === "good product"
      ? []
      : buildSuggested({
          brandSimple: extracted.brandSimple,
          productType: extracted.product,
          marketplaceHost,
        });

  const pricing = {
    listingPrice: extracted.price ?? null,
    listingPriceValue: Number.isFinite(extracted.priceValue) ? extracted.priceValue : null,
    typicalBrandPrice: brandPriceData ?? null,
    typicalCategoryPrice: productPriceData ?? null,
  };

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

    pricing,

    links: {
      primary: {
        label: "Original product",
        cta:
          overall.status === "good product"
            ? "Go back to your product →"
            : "Open the original product →",
        href: primaryLink,
        asin: asin || null,
      },
      suggestedLabel:
        overall.status === "good product" ? null : "Your best-value options",
      suggestedNote:
        overall.status === "good product"
          ? null
          : "These options are picked to cover a low, mid, and high price range while aiming for strong value-for-price. Availability and pricing are shown on Amazon.",
      suggested,
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

    const aiResult = await buildAiResult(extracted, analyses, url);

    return Response.json({ aiResult, extracted });
  } catch {
    return Response.json({ error: "Request failed." }, { status: 500 });
  }
}
