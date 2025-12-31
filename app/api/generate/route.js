export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";

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

/* ----------------- DOMAIN SIGNALS ----------------- */

async function getDomainSignals(domain) {
  try {
    const data = await whois(domain);
    const created =
      data.creationDate ||
      data.createdDate ||
      data.registeredDate ||
      null;

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

/* ----------------- STATIC FETCH (NO PLAYWRIGHT) ----------------- */

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await res.text();

  const text = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 9000);
}

/* ----------------- API HANDLER ----------------- */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL" }),
        { status: 400 }
      );
    }

    const domain = getDomain(url) || "unknown";
    const domainSignals = await getDomainSignals(domain);
    const pageText = await fetchPageText(url);

    /* -------- AI #1: PAGE EXTRACTION -------- */
    let pageData = {};
    {
      const prompt = `
Extract factual on-page product data.

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
  "brand": "string | null",
  "productType": "string | null"
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      pageData = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #2: WEBSITE TRUST (1–5) -------- */
    let siteTrust = {};
    {
      const prompt = `
You are evaluating WEBSITE TRUSTWORTHINESS.

Rules:
- Do NOT use product reviews
- Consider:
  - Domain age
  - Registrar
  - Platform reputation (Amazon, etc.)
  - Presence of third-party sellers
- Conservative
- JSON only

Website:
${JSON.stringify(domainSignals)}

URL:
${url}

Respond:
{
  "trustScore": 1 | 2 | 3 | 4 | 5,
  "confidence": "high" | "medium" | "low",
  "reasoning": "string",
  "riskFactors": ["string"]
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      siteTrust = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #3: SELLER CLARITY -------- */
    let sellerAssessment = {};
    {
      const prompt = `
Assess seller clarity ONLY.

Rules:
- No reputation guessing
- Missing or generic sellers increase risk
- JSON only

Seller:
"${pageData?.seller || "none"}"

Respond:
{
  "sellerFound": true | false,
  "sellerClarity": "clear" | "unclear" | "missing",
  "riskContribution": "low" | "medium" | "high",
  "notes": "string"
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      sellerAssessment = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #4: PRODUCT PRICE & QUALITY -------- */
    let productAssessment = {};
    {
      const prompt = `
Evaluate product price fairness and quality risk.

Rules:
- Reviews are secondary
- Be conservative
- JSON only

Product:
${JSON.stringify(pageData)}

Respond:
{
  "priceFairness": "cheap" | "fair" | "overpriced" | "unknown",
  "qualityRisk": "low" | "medium" | "high",
  "explanation": "string"
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      productAssessment = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- AI #5: FINAL VERDICT -------- */
    let finalDecision = {};
    {
      const prompt = `
You are an online shopping risk evaluator.

Rules:
- Website trust is primary
- Seller clarity affects site trust
- Product quality affects recommendation
- Prefer SAME WEBSITE alternatives if needed
- JSON only

Website Trust:
${JSON.stringify(siteTrust)}

Seller:
${JSON.stringify(sellerAssessment)}

Product:
${JSON.stringify(productAssessment)}

Respond:
{
  "overallRisk": "low" | "medium" | "high",
  "confidence": "high" | "medium" | "low",
  "summary": "string",
  "recommendedAction": "buy" | "buy_but_caution" | "avoid",
  "alternativeSuggestion":
    "same_site_better_seller" |
    "same_site_similar_product" |
    "different_site" |
    null
}`;
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });
      finalDecision = safeJSONParse(r.choices[0].message.content, {});
    }

    /* -------- RESPONSE -------- */

    return new Response(
      JSON.stringify({
        websiteTrust: siteTrust,
        seller: sellerAssessment,
        product: productAssessment,
        verdict: finalDecision,
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
