export const runtime = "nodejs";

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const APIFLASH_KEY = process.env.APIFLASH_KEY;

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
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

/* ----------------- Screenshot (ApiFlash) ----------------- */
async function screenshotPage(url) {
  if (!APIFLASH_KEY) throw new Error("ApiFlash key missing");

  const screenshotUrl =
    `https://api.apiflash.com/v1/urltoimage` +
    `?access_key=${APIFLASH_KEY}` +
    `&url=${encodeURIComponent(url)}` +
    `&full_page=true` +
    `&wait_until=page_loaded` +
    `&format=png`;

  const res = await fetch(screenshotUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ApiFlash error ${res.status}: ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const domain = new URL(url).hostname;

    /* 1) Screenshot page */
    const screenshotBase64 = await screenshotPage(url);

    /* 2) GPT: Extract product info (URL + domain INCLUDED) */
    const extractPrompt = `
You are analyzing a product page.

Product URL:
${url}

Website domain:
${domain}

Using the screenshot, extract:
- product title
- seller or brand
- price
- main features
- star rating (1–5)
- review count

Return JSON ONLY:
{
  "title": string,
  "seller": string,
  "price": string,
  "features": string[],
  "stars": number,
  "reviewCount": number
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
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
      temperature: 0,
    });

    const extractText =
      extractResponse.output?.[0]?.content?.[0]?.text || "";

    const productInfo = safeJSONParse(extractText, {});

    if (!productInfo.title) {
      return new Response(
        JSON.stringify({ error: "Failed to extract product info" }),
        { status: 500 }
      );
    }

    /* 3) Brave Search — IMPROVED USING SCREENSHOT DATA + DOMAIN */
    const productSearchQuery = `${productInfo.title} ${productInfo.seller || ""} reviews`;
    const domainSearchQuery = `${domain} legit reviews scam`;

    const productResults = await braveSearch(productSearchQuery, 5);
    const domainResults = await braveSearch(domainSearchQuery, 5);

    const searchSummary = [...productResults, ...domainResults]
      .map(
        (r, i) => `Result ${i + 1}:
- Title: ${r.title}
- URL: ${r.url}
- Snippet: ${r.snippet || "N/A"}`
      )
      .join("\n\n");

    /* 4) Final GPT evaluation (GENERAL KNOWLEDGE + SEARCH + URL) */
    const finalPrompt = `
You are a product trust evaluator AI.

You are allowed to use:
- General knowledge about well-known and unknown websites
- The product screenshot data
- The website domain
- The provided web search results

Product URL:
${url}

Website domain:
${domain}

Extracted product info:
${JSON.stringify(productInfo, null, 2)}

Web search results:
${searchSummary || "No external results found"}

Evaluate the trustworthiness of:
- the website
- the seller
- the product

Return JSON ONLY:
{
  "title": string,
  "status": "good" | "bad",
  "websiteTrust": { "score": 1-5, "reason": string },
  "sellerTrust": { "score": 1-5, "reason": string },
  "productTrust": { "score": 1-5, "reason": string },
  "overall": { "score": 1-5, "reason": string },
  "alternative": { "title": string, "url": string, "price": string, "seller": string } | null
}
`;

    const finalResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: finalPrompt,
      temperature: 0.1,
    });

    const finalText =
      finalResponse.output?.[0]?.content?.[0]?.text || "";

    const evaluation = safeJSONParse(finalText, {});

    return new Response(
      JSON.stringify({ aiResult: evaluation }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
}
