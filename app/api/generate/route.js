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
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const domain = new URL(url).hostname;

    const screenshotBase64 = await screenshotPage(url, {
      hideSelectors: domain.includes("amazon.com")
        ? ".a-popover,.glow-toaster,.a-declarative,.nav-main,.nav-flyout"
        : "",
    });

    const extractPrompt = `
Extract ONLY information that is explicitly visible.

Rules:
- Do NOT guess
- Do NOT infer missing data
- If unclear or missing, return null

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
            { type: "input_image", image_url: `data:image/png;base64,${screenshotBase64}` },
          ],
        },
      ],
    });

    const extractText =
      extractResponse.output?.[0]?.content?.[0]?.text ?? "{}";

    const productInfo = safeJSONParse(extractText, { features: [] });

    const sellerResults = productInfo.seller
      ? await braveSearch(`"${productInfo.seller}" reviews OR scam OR fraud`, 7)
      : [];

    const domainResults = await braveSearch(
      `"${domain}" scam OR fraud OR review`,
      7
    );

    const productResults = productInfo.title
      ? await braveSearch(`"${productInfo.title}" reviews OR fake`, 7)
      : [];

    const structuredEvidence = {
      seller_issues: mapIssues(sellerResults),
      domain_issues: mapIssues(domainResults),
      product_issues: mapIssues(productResults),
      positive_signals: [],
      evidence_strength: "moderate",
    };

    return new Response(
      JSON.stringify({
        base64: screenshotBase64,
        productInfo,
        structuredEvidence,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
