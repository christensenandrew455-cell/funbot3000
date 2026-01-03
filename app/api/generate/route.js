export const runtime = "nodejs";

import { OpenAI } from "openai";
import fetch from "node-fetch";
import { chromium } from "playwright-core";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BROWSER_WS_ENDPOINT = process.env.BROWSER_WS_ENDPOINT;

/* ----------------- helpers ----------------- */
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

/* ----------------- PLAYWRIGHT SCRAPER ----------------- */
async function scrapeWithPlaywright(url) {
  const browser = await chromium.connectOverCDP(BROWSER_WS_ENDPOINT);

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const productSignals = await page.evaluate(() => {
    const getText = (sel) =>
      document.querySelector(sel)?.textContent?.trim() || null;

    const getAttr = (sel, attr) =>
      document.querySelector(sel)?.getAttribute(attr) || null;

    const meta = (name) =>
      document.querySelector(`meta[property="${name}"]`)?.content ||
      document.querySelector(`meta[name="${name}"]`)?.content ||
      null;

    return {
      title:
        getText("h1") ||
        meta("og:title") ||
        null,

      price:
        getAttr('[itemprop="price"]', "content") ||
        getText('[class*="price"]') ||
        meta("product:price:amount") ||
        null,

      currency:
        getAttr('[itemprop="priceCurrency"]', "content") ||
        meta("product:price:currency") ||
        null,

      averageRating:
        getAttr('[itemprop="ratingValue"]', "content") ||
        getText('[class*="rating"]') ||
        null,

      reviewCount:
        getAttr('[itemprop="reviewCount"]', "content") ||
        getText('[class*="review"]') ||
        null,

      seller:
        getText('[itemprop="seller"]') ||
        getText('[class*="seller"]') ||
        getText('[class*="brand"]') ||
        null,

      description:
        getText('[itemprop="description"]') ||
        meta("og:description") ||
        null,
    };
  });

  await browser.close();
  return productSignals;
}

/* ----------------- BRAVE SEARCH ----------------- */
async function braveSearch(query) {
  if (!query) return [];
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
      query
    )}&size=5`,
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
}

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    /* 1. Scrape product page */
    const productSignals = await scrapeWithPlaywright(url);

    /* 2. Market + seller research */
    const productSearchResults = await braveSearch(
      `${productSignals.title} average price`
    );

    const sellerSearchResults = await braveSearch(
      productSignals.seller
    );

    /* 3. GPT analysis */
    const evalPrompt = `
You are a product investigation system.

Rules:
- Do NOT recommend buying.
- Do NOT trust reviews at face value.
- Think like a researcher, not a marketer.

Product page data:
${JSON.stringify(productSignals)}

Market price research:
${JSON.stringify(productSearchResults)}

Seller research:
${JSON.stringify(sellerSearchResults)}

Tasks:
1. Extract clean product info
2. Detect AI-generated description patterns
3. Evaluate review manipulation risk:
   - Few reviews + perfect rating = suspicious
   - Many reviews ≠ quality proof
4. Compare price vs market average
5. Assess scam likelihood logically

Return JSON ONLY:

{
  "title": string | null,
  "price": string | null,
  "currency": string | null,
  "averageRating": string | null,
  "reviewCount": string | null,
  "seller": string | null,
  "description": string | null,

  "signals": {
    "aiGeneratedDescription": boolean,
    "reviewManipulationLikely": boolean,
    "overpricedLikely": boolean
  },

  "analysis": {
    "summary": string,
    "riskLevel": "low" | "medium" | "high"
  }
}
`;

    const gptResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.1,
    });

    const evaluation = safeJSONParse(
      gptResp.choices[0].message.content,
      {}
    );

    return new Response(JSON.stringify({ result: evaluation }), {
      status: 200,
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
