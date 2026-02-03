export const runtime = "nodejs";

import { OpenAI } from "openai";
import cheerio from "cheerio";

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

function getResponseText(res) {
  if (res.output_text) return res.output_text;
  for (const msg of res.output || []) {
    for (const c of msg.content || []) {
      if (c.text) return c.text;
    }
  }
  return "";
}

function safeJSONParse(text, fallback = {}) {
  try {
    const match = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

/* ===================== HTML EXTRACTOR ===================== */

async function extractFromHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      null;

    let price =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]').first().text() ||
      null;

    if (price) price = price.replace(/\s+/g, " ").trim();

    const seller =
      $('[itemprop="brand"]').text() ||
      $('meta[property="og:site_name"]').attr("content") ||
      null;

    return {
      title: title || null,
      price: price || null,
      seller: seller || null,
      platform: new URL(url).hostname.replace("www.", ""),
      claims: [],
      source: "html",
    };
  } catch {
    return null;
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

    // 1. HTML FIRST
    let productInfo = await extractFromHTML(url);

    // 2. FALLBACK TO BRAVE + AI
    if (!productInfo || !productInfo.title) {
      const results = await braveSearch(
        `${domain} product review price scam`
      );

      const snippets = results
        .map(r => `${r.title} — ${r.snippet}`)
        .join("\n");

      const extractPrompt = `
Extract factual product info. Do NOT guess.

Text:
${snippets}

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

      productInfo = safeJSONParse(
        getResponseText(extractResponse),
        { claims: [] }
      );
      productInfo.source = "brave";
    }

    // 3. REASONING
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
      getResponseText(reasoningResponse),
      {}
    );

    // 4. UI ADAPTER
    const aiResult = {
      title: productInfo.title,

      websiteTrust: {
        score: analysis.scam > 60 ? 1 : analysis.scam > 30 ? 3 : 5,
        reason: "Domain and reputation signals.",
      },

      sellerTrust: {
        score: analysis.dropship > 60 ? 2 : 4,
        reason: "Sourcing indicators.",
      },

      productTrust: {
        score: analysis.overpriced > 60 ? 2 : 4,
        reason: "Price vs market expectations.",
      },

      overall: {
        score: analysis.scam > 60 ? 1 : analysis.scam > 30 ? 3 : 5,
        reason: "Aggregated risk signals.",
      },

      status: analysis.scam > 60 ? "bad" : "good",
    };

    return new Response(
      JSON.stringify({ base64: null, aiResult }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
