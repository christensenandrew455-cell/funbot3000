export const runtime = "nodejs";

import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY;

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

async function braveSearch(query, size = 5) {
  if (!query) return [];
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

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    if (!SCREENSHOT_API_KEY) {
      return new Response(JSON.stringify({ error: "Screenshot API key missing" }), { status: 500 });
    }

    /* ----------------- STEP 1: Screenshot URL (PUBLIC IMAGE) ----------------- */
    const screenshotURL =
      `https://shot.screenshotapi.net/screenshot` +
      `?token=${SCREENSHOT_API_KEY}` +
      `&url=${encodeURIComponent(url)}` +
      `&output=image` +
      `&device=desktop` +
      `&full_page=true` +
      `&wait_until=domcontentloaded`;

    /* ----------------- STEP 2: GPT Vision ----------------- */
    const visionPrompt = `
You are a product investigator AI.

Analyze the product page screenshot and extract:

- product title
- seller or brand
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

    const visionResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: visionPrompt },
            {
              type: "input_image",
              image_url: screenshotURL,
            },
          ],
        },
      ],
      temperature: 0,
    });

    const productInfo = safeJSONParse(visionResponse.output_text, {});

    if (!productInfo?.title) {
      return new Response(
        JSON.stringify({ error: "Failed to extract product info" }),
        { status: 500 }
      );
    }

    /* ----------------- STEP 3: Brave Search ----------------- */
    const searchResults = await braveSearch(productInfo.title, 5);

    const searchSummary = searchResults
      .map(
        (r, i) => `Result ${i + 1}:
- Title: ${r.title}
- URL: ${r.url}
- Snippet: ${r.snippet || "N/A"}`
      )
      .join("\n\n");

    /* ----------------- STEP 4: Trust Evaluation ----------------- */
    const finalPrompt = `
You are a product trust evaluator AI.

Given:
1) Product info:
${JSON.stringify(productInfo, null, 2)}

2) Search results:
${searchSummary}

Return JSON ONLY in this format:
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

    const evaluation = safeJSONParse(finalResponse.output_text, {});

    return new Response(
      JSON.stringify({ aiResult: evaluation, screenshotURL }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
