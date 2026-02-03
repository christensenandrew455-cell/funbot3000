export const runtime = "nodejs";

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ===================== HELPERS ===================== */

async function braveSearch(query, size = 7) {
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

/* ===================== API ===================== */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const domain = new URL(url).hostname.replace("www.", "");

    /* ---------- 1. BRAVE SEARCH ---------- */

    const urlResults = await braveSearch(`"${url}"`);
    const domainResults = await braveSearch(`${domain} review OR scam OR fraud`);
    const generalResults = await braveSearch(url);

    const combinedSnippets = [
      ...urlResults,
      ...generalResults,
      ...domainResults,
    ]
      .map((r) => r.title + " — " + r.snippet)
      .join("\n");

    /* ---------- 2. EXTRACT PRODUCT INFO ---------- */

    const extractPrompt = `
You are extracting factual product information.

Rules:
- Use ONLY the provided text
- Do NOT guess
- If missing, return null

Text:
${combinedSnippets}

Return JSON ONLY:
{
  "title": string | null,
  "price": string | null,
  "seller": string | null,
  "platform": string | null,
  "claims": string[],
  "category": string | null
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: extractPrompt,
    });

    const extractText =
      extractResponse.output?.[0]?.content?.[0]?.text ?? "{}";

    const productInfo = safeJSONParse(extractText, { claims: [] });

    /* ---------- 3. DEEP REASONING ---------- */

    const reasoningPrompt = `
Evaluate the legitimacy of this product.

Product data:
${JSON.stringify(productInfo, null, 2)}

Tasks:
- Does it physically/scientifically do what it claims?
- Is pricing likely inflated?
- Is it likely dropshipped?
- Is this a known scam category?

Return JSON ONLY:
{
  "scamLikelihood": number, // 0–100
  "overpricingLikelihood": number, // 0–100
  "dropshipLikelihood": number, // 0–100
  "keyConcerns": string[],
  "betterAlternatives": string[],
  "confidence": "low" | "medium" | "high"
}
`;

    const reasoningResponse = await openai.responses.create({
      model: "gpt-4o",
      input: reasoningPrompt,
    });

    const reasoningText =
      reasoningResponse.output?.[0]?.content?.[0]?.text ?? "{}";

    const analysis = safeJSONParse(reasoningText, {});

    return new Response(
      JSON.stringify({
        source: "brave+ai",
        productInfo,
        analysis,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
