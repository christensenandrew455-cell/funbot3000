export const runtime = "nodejs";

import { OpenAI } from "openai";
import playwright from "playwright-chromium";

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

/* ----------------- Playwright Screenshot ----------------- */
async function screenshotPage(url) {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    const screenshot = await page.screenshot({ fullPage: true, type: "png" });
    return screenshot.toString("base64");
  } finally {
    await browser.close();
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
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

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
            { type: "input_image", image_base64: screenshotBase64 },
          ],
        },
      ],
      temperature: 0,
    });

    const productInfo = safeJSONParse(screenshotAnalysis.output_text, {});

    if (!productInfo.title) {
      return new Response(
        JSON.stringify({ error: "Unable to extract product info from screenshot." }),
        { status: 500 }
      );
    }

    /* 3. Brave search for product name */
    const searchResults = await braveSearch(productInfo.title, 5);

    // Summarize search results for GPT input
    const searchSummary = searchResults
      .map((r, i) => `Result ${i + 1}:
- Title: ${r.title}
- URL: ${r.url}
- Snippet: ${r.snippet || "N/A"}`)
      .join("\n\n");

    /* 4. GPT: Combine screenshot + search results */
    const finalPrompt = `
You are a product trust evaluator AI.

Given:
1) Product info from screenshot:
${JSON.stringify(productInfo, null, 2)}

2) Recent top search results for this product:
${searchSummary}

Tasks:
- Verify if the price is reasonable.
- Assess if the product seems legitimate or a scam.
- Evaluate the seller's trustworthiness based on available info.
- Suggest a better or cheaper alternative if one exists.
- Return a conservative, logical assessment.
- Return JSON ONLY in this format:

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
      temperature: 0.1,
    });

    const evaluation = safeJSONParse(finalAnalysis.output_text, {});

    return new Response(JSON.stringify({ aiResult: evaluation }), { status: 200 });
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
