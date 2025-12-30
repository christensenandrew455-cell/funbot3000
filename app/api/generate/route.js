export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";
import { JSDOM } from "jsdom";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ----------------- utilities ----------------- */

function safeJSONParse(text) {
  try {
    const cleaned = text
      .replace(/```json/g, "")
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

async function getDomainAge(domain) {
  try {
    const data = await whois(domain);
    const created =
      data.creationDate || data.createdDate || data.registered;
    if (!created) return null;
    return Math.floor(
      (Date.now() - new Date(created).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  } catch {
    return null;
  }
}

/* ----------------- page extraction ----------------- */

async function extractHTML(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ProductAnalyzer/1.0)",
    },
  });
  return res.text();
}

function extractVisibleText(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  document
    .querySelectorAll("script, style, noscript")
    .forEach((el) => el.remove());

  return (
    document.body?.textContent || ""
  )
    .replace(/\s+/g, " ")
    .slice(0, 9000);
}

/* ----------------- review extraction ----------------- */

function extractReviewText(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const candidates = [];

  // JSON-LD reviews (best signal)
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => {
      try {
        const data = JSON.parse(el.textContent);
        if (data.review) {
          candidates.push(JSON.stringify(data.review));
        }
      } catch {}
    });

  // Visible review-like text
  document
    .querySelectorAll(
      '[class*="review"], [id*="review"], [class*="rating"]'
    )
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 40) {
        candidates.push(text);
      }
    });

  const combined = candidates
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 8000);

  return combined || null;
}

/* ----------------- API handler ----------------- */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL" }),
        { status: 400 }
      );
    }

    const domain = getDomain(url);
    const domainAgeDays = await getDomainAge(domain);

    /* -------- website heuristics -------- */

    let websiteTrustScore = 50;
    const flags = [];

    if (domainAgeDays !== null) {
      if (domainAgeDays < 180) {
        websiteTrustScore -= 30;
        flags.push("Recently registered domain");
      } else if (domainAgeDays > 1825) {
        websiteTrustScore += 20;
      }
    }

    /* -------- fetch page -------- */

    const html = await extractHTML(url);
    const pageText = extractVisibleText(html);

    /* -------- AI #1: page understanding -------- */

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

      pageUnderstanding = safeJSONParse(
        r.choices[0].message.content
      );
    }

    /* -------- AI #2: product review analysis -------- */

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

      reviewAnalysis = safeJSONParse(
        r.choices[0].message.content
      );
    }

    /* -------- AI #3: final scam synthesis -------- */

    const scamPrompt = `
You are an e-commerce risk analyst.

Inputs:
- Domain: ${domain}
- Domain age days: ${domainAgeDays ?? "unknown"}
- Website score: ${websiteTrustScore}/100
- Flags: ${flags.join(", ") || "none"}

Product:
- Title: ${pageUnderstanding?.productTitle ?? "unknown"}
- Seller: ${pageUnderstanding?.seller ?? "unknown"}

Reviews:
${JSON.stringify(reviewAnalysis, null, 2)}

Rules:
- Conservative
- Probabilistic language
- Output JSON ONLY

Respond:
{
  "status": "good" | "bad",
  "confidence": "high" | "medium" | "low",
  "review": "string",
  "likelyDropship": true | false
}
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: scamPrompt }],
    });

    const aiResult = safeJSONParse(
      r.choices[0].message.content
    );

    return new Response(
      JSON.stringify({
        aiResult,
        domain,
        websiteTrustScore,
        pageUnderstanding,
        reviewAnalysis,
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
