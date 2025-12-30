export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";
import whois from "whois-json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ----------------- utilities ----------------- */

function safeJSONParse(text, fallback = {}) {
  if (!text) return fallback;
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      .match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(cleaned) || fallback;
  } catch {
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
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DropLinkAI/1.0)",
      Accept: "text/html",
    },
  });
  return res.text();
}

function extractVisibleText(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  doc.querySelectorAll("script, style, noscript").forEach(el => el.remove());
  return (doc.body?.textContent || "").replace(/\s+/g, " ").slice(0, 8000);
}

function extractReviewText(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const chunks = [];

  doc.querySelectorAll('[class*="review"], [id*="review"], [class*="rating"]').forEach(el => {
    const t = el.textContent?.trim();
    if (t && t.length > 50) chunks.push(t);
  });

  return chunks.join(" ").slice(0, 6000) || null;
}

function reviewSignals(html) {
  const t = html.toLowerCase();
  return {
    mentionsReviews: t.includes("review"),
    mentionsStars: t.includes("★") || t.includes("stars"),
    mentionsRatings: t.includes("rating"),
  };
}

async function getDomainSignals(domain) {
  try {
    const data = await whois(domain);
    const created =
      data.creationDate || data.createdDate || data.registeredDate || null;

    const createdAt = created ? new Date(created) : null;
    const ageDays = createdAt
      ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
      : null;

    return {
      domain,
      ageDays,
      registrar: data.registrar || null,
    };
  } catch {
    return { domain, ageDays: null, registrar: null };
  }
}

/* ----------------- API handler ----------------- */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url)
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });

    const domain = getDomain(url) || "unknown";
    const html = await fetchHTML(url);
    const pageText = extractVisibleText(html);
    const reviewText = extractReviewText(html);
    const reviewMeta = reviewSignals(html);
    const domainSignals = await getDomainSignals(domain);

    /* -------- AI #1: Page parsing -------- */
    let pageData = {};
    if (pageText) {
      const prompt = `
Extract structured product information.
Rules:
- No guessing
- JSON only

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
      pageData = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #2: Review language analysis -------- */
    let reviewAnalysis = {};
    if (reviewText) {
      const prompt = `
Analyze review language quality.
Rules:
- Conservative
- No guessing
- JSON only

Reviews:
"""${reviewText}"""

Signals:
${JSON.stringify(reviewMeta)}

Respond:
{
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
    }

    /* -------- AI #3: Seller name pattern analysis -------- */
    let sellerAnalysis = {};
    if (pageData?.seller) {
      const prompt = `
Analyze seller name for fraud patterns.
You are NOT checking reputation.
You are checking name structure only.

Seller name: "${pageData.seller}"
Domain: ${domain}

Respond JSON only:
{
  "nameLooksLegit": true | false,
  "nameType": "brand" | "individual" | "random" | "unknown",
  "redFlags": ["string"]
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      sellerAnalysis = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #4: Final decision -------- */
    const finalPrompt = `
You are a risk assessment AI for online shopping.

FACTUAL SIGNALS:
Website:
${JSON.stringify(domainSignals)}

Product:
${JSON.stringify(pageData)}

Seller pattern analysis:
${JSON.stringify(sellerAnalysis)}

Reviews:
${JSON.stringify(reviewAnalysis)}

Rules:
- Be conservative
- Prefer safety
- If insufficient data, lean toward caution
- JSON only

Respond:
{
  "verdict": "low_risk" | "medium_risk" | "high_risk",
  "confidence": "high" | "medium" | "low",
  "summary": "string",
  "recommendedAlternative": "string | null"
}`;

    const finalResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: finalPrompt }],
    });

    const finalDecision = safeJSONParse(
      finalResp.choices[0].message.content,
      {}
    );

    const aiResult = {
      status: finalDecision.verdict === "low_risk" ? "good" : "bad",
      review: finalDecision.summary || "Insufficient data to assess safely.",
      title: pageData.productTitle || "Unknown product",
      sellerTrust:
        sellerAnalysis?.nameLooksLegit === false ? "Suspicious" : "Unclear",
      confidence: finalDecision.confidence || "low",
      alternative: finalDecision.recommendedAlternative || null,
    };

    return new Response(JSON.stringify({ aiResult }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
