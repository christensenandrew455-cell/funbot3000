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
- Do NOT guess
- Do NOT infer missing data
- If unclear or missing, return null
- Numbers must be visible as numbers

Context:
URL: ${url}
Domain: ${domain}

Return JSON ONLY:
{
  "title": string | null,
  "seller": string | null,
  "price": string | null,
  "features": string[],
  "stars": number | null,
  "reviewCount": number | null
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: extractPrompt },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${screenshotBase64}`,
            },
          ],
        },
      ],
    });

    const extractText =
      extractResponse.output?.[0]?.content?.[0]?.text ?? "{}";

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

    /* ---------- 4) STRUCTURE EVIDENCE ---------- */
    const structuredEvidence = {
      seller_issues: mapIssues(sellerResults),
      domain_issues: mapIssues(domainResults),
      product_issues: mapIssues(productResults),
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

    /* ---------- 6) FINAL EVALUATION ---------- */
    const finalPrompt = `
You are a conservative product trust evaluator.

Rules:
- Use ONLY the evidence provided
- Penalize missing or weak data
- Never invent facts
- If uncertain, say so explicitly

Product info:
${JSON.stringify(productInfo, null, 2)}

Structured evidence:
${JSON.stringify(structuredEvidence, null, 2)}

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
