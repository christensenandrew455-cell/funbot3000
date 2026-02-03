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

    const combinedSnippets = [...urlResults, ...generalResults, ...domainResults]
      .map(r => `${r.title} — ${r.snippet}`)
      .join("\n");

    /* ---------- 2. EXTRACT PRODUCT INFO ---------- */

    const extractPrompt = `
Extract factual product info.

Text:
${combinedSnippets}

Return JSON ONLY:
{
  "title": string | null,
  "price": string | null,
  "seller": string | null,
  "platform": string | null,
  "claims": string[]
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: extractPrompt,
    });

    const productInfo = safeJSONParse(
      extractResponse.output?.[0]?.content?.[0]?.text,
      { claims: [] }
    );

    /* ---------- 3. REASONING ---------- */

    const reasoningPrompt = `
Evaluate product legitimacy.

Product:
${JSON.stringify(productInfo, null, 2)}

Return JSON ONLY:
{
  "scam": number,
  "overpriced": number,
  "dropship": number,
  "confidence": "low" | "medium" | "high"
}
`;

    const reasoningResponse = await openai.responses.create({
      model: "gpt-4o",
      input: reasoningPrompt,
    });

    const analysis = safeJSONParse(
      reasoningResponse.output?.[0]?.content?.[0]?.text,
      {}
    );

    /* ---------- 4. UI ADAPTER (THIS WAS MISSING) ---------- */

    const aiResult = {
      title: productInfo.title,

      websiteTrust: {
        score: analysis.scam > 60 ? 1 : analysis.scam > 30 ? 3 : 5,
        reason: "Based on domain reputation and reported issues.",
      },

      sellerTrust: {
        score: analysis.dropship > 60 ? 2 : 4,
        reason: "Seller behavior and sourcing indicators.",
      },

      productTrust: {
        score: analysis.overpriced > 60 ? 2 : 4,
        reason: "Pricing and claim realism.",
      },

      overall: {
        score: analysis.scam > 60 ? 1 : analysis.scam > 30 ? 3 : 5,
        reason: "Aggregated risk signals.",
      },

      status: analysis.scam > 60 ? "bad" : "good",
    };

    return new Response(
      JSON.stringify({
        base64: null,       // screenshot disabled, but UI-safe
        aiResult,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
