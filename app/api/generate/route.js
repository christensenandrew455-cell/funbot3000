export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ----------------- utilities ----------------- */
function safeJSONParse(text, fallback = {}) {
  if (!text) return fallback;
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      // take substring from first { to last }
      .match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(cleaned) || fallback;
  } catch (err) {
    console.error("JSON parse failed:", err);
    return fallback;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductAnalyzer/1.0)" },
  });
  return res.text();
}

function extractVisibleText(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  document.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  return (document.body?.textContent || "").replace(/\s+/g, " ").slice(0, 9000);
}

function extractReviewText(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const candidates = [];

  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      const data = JSON.parse(el.textContent);
      if (data.review) candidates.push(JSON.stringify(data.review));
    } catch {}
  });

  document.querySelectorAll('[class*="review"], [id*="review"], [class*="rating"]').forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 40) candidates.push(text);
  });

  const combined = candidates.join(" ").replace(/\s+/g, " ").slice(0, 8000);
  return combined || null;
}

/* ----------------- API handler ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    const domain = getDomain(url) || "unknown";
    const html = await fetchHTML(url);
    const pageText = extractVisibleText(html);

    /* -------- AI #1: product page parsing -------- */
    let pageUnderstanding = {};
    if (pageText) {
      try {
        const prompt = `
You are a product page parser.
Rules:
- Do NOT guess
- If missing, return null
- Output JSON ONLY

Text:
"""${pageText}"""

Respond:
{
  "isProductPage": true | false,
  "productTitle": "string | null",
  "price": "string | null",
  "seller": "string | null",
  "productType": "string | null"
}`;
        const r = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
        });
        pageUnderstanding = safeJSONParse(r.choices[0].message.content, {});
      } catch (err) {
        console.error("Page parsing AI failed:", err);
        pageUnderstanding = {};
      }
    }

    /* -------- AI #2: website trust analysis -------- */
    let websiteTrust = {};
    try {
      const prompt = `
You are an e-commerce website evaluator.
Given:
- Website domain: ${domain}
Rules:
- Do NOT guess
- Assess trustworthiness of the website
- Consider known scams, reputation, user safety
- Output JSON ONLY
Respond:
{
  "isTrusted": true | false,
  "confidence": "high" | "medium" | "low",
  "reason": "string"
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      websiteTrust = safeJSONParse(r.choices[0].message.content, {});
    } catch (err) {
      console.error("Website trust AI failed:", err);
      websiteTrust = {};
    }

    /* -------- AI #3: product review analysis -------- */
    const reviewText = extractReviewText(html);
    let reviewAnalysis = {};
    if (reviewText) {
      try {
        const prompt = `
You analyze product reviews.
Rules:
- Do NOT guess
- Be conservative
- Output JSON ONLY
Reviews:
"""${reviewText}"""
Respond:
{
  "hasReviews": true | false,
  "reviewQuality": "high" | "medium" | "low",
  "aiGeneratedLikelihood": "low" | "medium" | "high",
  "redFlags": ["string"],
  "summary": "string"
}`;
        const r = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
        });
        reviewAnalysis = safeJSONParse(r.choices[0].message.content, {});
      } catch (err) {
        console.error("Review analysis AI failed:", err);
        reviewAnalysis = {};
      }
    }

    /* -------- AI #4: seller analysis -------- */
    let sellerAnalysis = {};
    const sellerName = pageUnderstanding?.seller;
    if (sellerName) {
      try {
        const prompt = `
You analyze e-commerce sellers.
Given:
- Seller name: ${sellerName}
- Domain: ${domain}
Rules:
- Do NOT guess
- If no data, return null
- Output JSON ONLY
- Focus on reputation and reviews
Respond:
{
  "sellerExists": true | false,
  "sellerReviewCount": number | null,
  "sellerReviewQuality": "high" | "medium" | "low" | null,
  "redFlags": ["string"]
}`;
        const r = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
        });
        sellerAnalysis = safeJSONParse(r.choices[0].message.content, {});
      } catch (err) {
        console.error("Seller analysis AI failed:", err);
        sellerAnalysis = {};
      }
    }

    /* -------- AI #5: recommendation AI -------- */
    let recommendation = {};
    try {
      const prompt = `
You are an e-commerce assistant.
Inputs:
- Website trust: ${JSON.stringify(websiteTrust)}
- Product: ${JSON.stringify(pageUnderstanding)}
- Seller: ${JSON.stringify(sellerAnalysis)}
- Product reviews: ${JSON.stringify(reviewAnalysis)}
Task:
- Decide if the user should:
  1) Keep the product and seller
  2) Switch to a different seller on the same website
  3) Switch to the same product on a different website
  4) Switch to a better similar product
- Prefer original website when possible
- Output JSON ONLY
Respond:
{
  "action": "keep" | "newSeller" | "newWebsite" | "betterProduct",
  "reason": "string",
  "recommendedLink": "string | null"
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      recommendation = safeJSONParse(r.choices[0].message.content, {});
    } catch (err) {
      console.error("Recommendation AI failed:", err);
      recommendation = {};
    }

    return new Response(
      JSON.stringify({
        pageUnderstanding,
        websiteTrust,
        reviewAnalysis,
        sellerAnalysis,
        recommendation,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
}
