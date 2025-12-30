export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";
import { chromium } from "playwright";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ----------------- helpers ----------------- */

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

/* ----------------- PLAYWRIGHT SCRAPER ----------------- */

async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // scroll to load lazy content (reviews)
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1200);
    }

    const pageText = await page.evaluate(() => {
      document.querySelectorAll("script, style, noscript").forEach(el => el.remove());
      return document.body?.innerText || "";
    });

    const reviewText = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll(
          '[class*="review"], [id*="review"], [class*="rating"], [data-review]'
        )
      );
      return nodes
        .map(n => n.innerText)
        .filter(t => t && t.length > 50)
        .join(" ");
    });

    await browser.close();

    return {
      pageText: pageText.slice(0, 8000),
      reviewText: reviewText.slice(0, 8000) || null,
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

/* ----------------- API HANDLER ----------------- */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url)
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });

    const domain = getDomain(url) || "unknown";
    const domainSignals = await getDomainSignals(domain);

    const { pageText, reviewText } = await scrapeWithPlaywright(url);

    /* -------- AI #1: Page parsing -------- */
    let pageData = {};
    if (pageText) {
      const prompt = `
Extract structured product data.
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

    /* -------- AI #2: Review analysis -------- */
    let reviewAnalysis = {};
    if (reviewText) {
      const prompt = `
Analyze product reviews.
Rules:
- Conservative
- No guessing
- JSON only

Reviews:
"""${reviewText}"""

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

    /* -------- AI #3: Seller name pattern -------- */
    let sellerAnalysis = {};
    if (pageData?.seller) {
      const prompt = `
Analyze seller name pattern only (NOT reputation).

Seller: "${pageData.seller}"
Domain: ${domain}

Respond JSON:
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

    /* -------- AI #4: Final verdict -------- */
    const finalPrompt = `
You are an online shopping risk assessor.

FACTS:
Website:
${JSON.stringify(domainSignals)}

Product:
${JSON.stringify(pageData)}

Seller pattern:
${JSON.stringify(sellerAnalysis)}

Reviews:
${JSON.stringify(reviewAnalysis)}

Rules:
- Conservative
- Safety first
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
      review: finalDecision.summary || "Insufficient data.",
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
