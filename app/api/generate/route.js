export const runtime = "nodejs";

import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ----------------- Helpers ----------------- */
function safeJSONParse(text, fallback = {}) {
  try {
    const cleaned = text
      ?.replace(/```json/gi, "")
      ?.replace(/```/g, "")
      ?.match(/\{[\s\S]*\}/)?.[0];
    return cleaned ? JSON.parse(cleaned) : fallback;
  } catch {
    return fallback;
  }
}

/* ----------------- Brave Search ----------------- */
async function braveSearch(query, size = 5) {
  if (!query) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/v1/web/search?q=${encodeURIComponent(query)}&size=${size}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY
        }
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    // Puppeteer-based screenshot (Vercel safe)
    const { screenshotPage } = await import("../../../lib/server/screenshot.js");

    /* 1. Screenshot the page */
    const screenshotBase64 = await screenshotPage(url);

    /* 2. GPT: Extract product info from screenshot */
    const screenshotPrompt = `
You are a product investigator AI. Analyze the screenshot of a product page.
Extract the following information:
- product title
- seller/brand
- product price
- main product features
- star rating (1-5)
- review count

Return JSON ONLY in this format:
{
  "title": string,
  "seller": string,
  "price": string,
  "features": string[],
  "stars": number,
  "reviewCount": number
}
`;

    const screenshotAnalysis = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: screenshotPrompt },
            { type: "input_image", image_base64: screenshotBase64 }
          ]
        }
      ],
      temperature: 0
    });

    const productInfo = safeJSONParse(screenshotAnalysis.output_text, {});

    if (!productInfo.title) {
      return new Response(
        JSON.stringify({ error: "Unable to extract product info from screenshot." }),
        { status: 500 }
      );
    }

    /* 3. Brave search */
    const searchResults = await braveSearch(productInfo.title, 5);

    const searchSummary = searchResults
      .map(
        (r, i) => `Result ${i + 1}:
- Title: ${r.title}
- URL: ${r.url}
- Snippet: ${r.snippet || "N/A"}`
      )
      .join("\n\n");

    /* 4. Final GPT evaluation */
    const finalPrompt = `
You are a product trust evaluator AI.

Given:
1) Product info from screenshot:
${JSON.stringify(productInfo, null, 2)}

2) Recent top search results:
${searchSummary}

Return JSON ONLY in this format:
{
  "title": string,
  "status": "good" | "bad",
  "websiteTrust": { "score":1-5, "reason": string },
  "sellerTrust": { "score":1-5, "reason": string },
  "productTrust": { "score":1-5, "reason": string },
  "overall": { "score":1-5, "reason": string },
  "alternative": { "title": string, "url": string, "price": string, "seller": string } | null
}
`;

    const finalAnalysis = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: finalPrompt }],
      temperature: 0.1
    });

    const evaluation = safeJSONParse(finalAnalysis.output_text, {});

    return new Response(JSON.stringify({ aiResult: evaluation }), { status: 200 });
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
