export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ----------------- utilities ----------------- */
function safeJSONParse(text) {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function getDomain(url) {
  return new URL(url).hostname.replace(/^www\./, "");
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

  // JSON-LD reviews
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      const data = JSON.parse(el.textContent);
      if (data.review) candidates.push(JSON.stringify(data.review));
    } catch {}
  });

  // Visible review-like text
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

    const domain = getDomain(url);
    const html = await fetchHTML(url);
    const pageText = extractVisibleText(html);

    /* -------- AI #1: product page parsing -------- */
    let pageUnderstanding = null;
    if (pageText) {
      const pagePrompt = `
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
}
`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: pagePrompt }],
      });
      pageUnderstanding = safeJSONParse(r.choices[0].message.content);
    }

    /* -------- AI #2: website trust analysis -------- */
    let websiteTrust = null;
    const websitePrompt = `
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
}
`;
    const rWebsite = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: websitePrompt }],
    });
    websiteTrust = safeJSONParse(rWebsite.choices[0].message.content);

    /* -------- AI #3: product review analysis -------- */
    const reviewText = extractReviewText(html);
    let reviewAnalysis = null;
    if (reviewText) {
      const reviewPrompt = `
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
}
`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: reviewPrompt }],
      });
      reviewAnalysis = safeJSONParse(r.choices[0].message.content);
    }

    /* -------- AI #4: seller analysis -------- */
    let sellerAnalysis = null;
    const sellerName = pageUnderstanding?.seller;
    if (sellerName) {
      const sellerPrompt = `
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
}
`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: sellerPrompt }],
      });
      sellerAnalysis = safeJSONParse(r.choices[0].message.content);
    }

    /* -------- AI #5: recommendation AI -------- */
    let recommendation = null;
    const recPrompt = `
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
}
`;
    const rRec = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: recPrompt }],
    });
    recommendation = safeJSONParse(rRec.choices[0].message.content);

    /* -------- Final response -------- */
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
