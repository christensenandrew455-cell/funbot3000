export const runtime = "nodejs";

import { OpenAI } from "openai";
import { screenshotPage } from "@/lib/server/screenshot";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ===================== HELPERS ===================== */

function extractJSONObject(text = "") {
  const match = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .match(/\{[\s\S]*\}/);

  return match?.[0] ?? null;
}

function safeJSONParse(text, fallback = {}) {
  try {
    const json = extractJSONObject(text);
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

async function braveSearch(query, size = 5) {
  if (!query || !BRAVE_API_KEY) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/v1/web/search?q=${encodeURIComponent(query)}&size=${size}`,

      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );

    if (!res.ok) return [];

    const { results = [] } = await res.json();
    return results;
  } catch {
    return [];
  }
}

function mapIssues(results = []) {
  return results.map((r) => ({
    issue: r.snippet || "N/A",
    frequency: "medium",
    severity: "medium",
  }));
}

function parsePrice(text = "") {
  if (!text) return null;
  const match = text.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const normalized = match[1].replace(/,/g, "");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function buildComparablePrices(results = []) {
  return results
    .map((result) => {
      const price = parsePrice(result?.snippet || "") ?? parsePrice(result?.title || "");
      if (!price) return null;
      return {
        title: result?.title || "Unknown listing",
        url: result?.url || null,
        price,
        snippet: result?.snippet || "",
      };
    })
    .filter(Boolean);
}

function summarizePrices(prices = []) {
  if (!prices.length) {
    return {
      count: 0,
      min: null,
      max: null,
      median: null,
    };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const count = sorted.length;
  const mid = Math.floor(count / 2);
  const median =
    count % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : sorted[mid];
  return {
    count,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
  };
}

/* ===================== API ===================== */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    const domain = new URL(url).hostname;

    /* ---------- 1) SCREENSHOT ---------- */
    const screenshotBase64 = await screenshotPage(url, {
      hideSelectors: domain.includes("amazon.com")
        ? ".a-popover,.glow-toaster,.a-declarative,.nav-main,.nav-flyout"
        : "",
    });

    /* ---------- 2) PRODUCT EXTRACTION (VISION) ---------- */
    const extractPrompt = `
Extract ONLY information that is explicitly visible.

Rules:
@@ -126,71 +174,87 @@ Return JSON ONLY:

    const productInfo = safeJSONParse(extractText, { features: [] });

    console.log("PRODUCT INFO:", productInfo);

    /* ---------- 3) SEARCH (BRAVE ONLY) ---------- */
    const sellerResults = productInfo.seller
      ? await braveSearch(
          `"${productInfo.seller}" reviews OR complaint OR scam OR fraud`,
          7
        )
      : [];

    const domainResults = await braveSearch(
      `"${domain}" scam OR fraud OR legit OR review`,
      7
    );

    const productResults = productInfo.title
      ? await braveSearch(
          `"${productInfo.title}" reviews OR defect OR broken OR fake`,
          7
        )
      : [];

    const priceResults = productInfo.title
      ? await braveSearch(`"${productInfo.title}" price OR "buy"`, 6)
      : [];

    const comparablePrices = buildComparablePrices(priceResults);
    const priceStats = summarizePrices(
      comparablePrices.map((entry) => entry.price)
    );

    /* ---------- 4) STRUCTURE EVIDENCE ---------- */
    const structuredEvidence = {
      seller_issues: mapIssues(sellerResults),
      domain_issues: mapIssues(domainResults),
      product_issues: mapIssues(productResults),
      price_checks: {
        product_price: productInfo.price || null,
        comparable_prices: comparablePrices,
        price_stats: priceStats,
      },
      positive_signals: [],
      evidence_strength: "moderate",
    };

    const hasEvidence =
      sellerResults.length ||
      domainResults.length ||
      productResults.length;

    /* ---------- 5) EARLY EXIT (NO DATA) ---------- */
    if (!hasEvidence) {
      const title = productInfo?.title || "Unknown Product";

      return new Response(
        JSON.stringify({
          base64: screenshotBase64,
          productInfo,
          priceComparisons: comparablePrices,
          aiResult: {
            title,
            status: "uncertain",
            websiteTrust: {
              score: 1,
              reason: "No independent evidence found.",
            },
            sellerTrust: {
              score: 1,
              reason: "No independent evidence found.",
            },
            productTrust: {
              score: 1,
              reason: "No independent evidence found.",
            },
            overall: {
              score: 1,
              reason: "Insufficient evidence to assess trust.",
            },
          },
        }),
        { status: 200 }
      );
    }

@@ -213,36 +277,38 @@ ${JSON.stringify(structuredEvidence, null, 2)}
Return JSON ONLY:
{
  "title": string,
  "status": "good" | "bad" | "uncertain",
  "websiteTrust": { "score": 1-5, "reason": string },
  "sellerTrust": { "score": 1-5, "reason": string },
  "productTrust": { "score": 1-5, "reason": string },
  "overall": { "score": 1-5, "reason": string }
}
`;

    const finalResponse = await openai.responses.create({
      model: "gpt-4.1",
      input: [{ role: "user", content: [{ type: "input_text", text: finalPrompt }] }],
    });

    const finalText =
      finalResponse.output?.[0]?.content?.[0]?.text ?? "{}";

    const evaluation = safeJSONParse(finalText, {});

    /* ---------- 7) RESPONSE ---------- */
    return new Response(
      JSON.stringify({
        base64: screenshotBase64,
        productInfo,
        priceComparisons: comparablePrices,
        aiResult: evaluation,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
