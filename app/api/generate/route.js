export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

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
    const data = await Promise.race([
      whois(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("WHOIS timeout")), 3000)
      ),
    ]);

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
    return {
      domain,
      ageDays: null,
      registrar: null,
      whoisFailed: true,
    };
  }
}

/* ----------------- JSDOM SCRAPER ----------------- */

async function scrapeWithJsdom(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const { document } = dom.window;

  // 1. Visible text
  const visibleText = document.body?.textContent
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000) || "";

  // 2. Meta tags
  const meta = {};
  document.querySelectorAll("meta").forEach((m) => {
    const name = m.getAttribute("property") || m.getAttribute("name");
    const content = m.getAttribute("content");
    if (name && content) meta[name] = content;
  });

  // 3. JSON-LD
  const jsonLd = [];
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((s) => {
      try {
        jsonLd.push(JSON.parse(s.textContent));
      } catch {}
    });

  // 4. Inline JSON
  const inlineJSON = [];
  document.querySelectorAll("script").forEach((s) => {
    const text = s.textContent?.trim();
    if (
      text &&
      (text.startsWith("{") || text.startsWith("window")) &&
      text.length > 200
    ) {
      inlineJSON.push(text.slice(0, 2000));
    }
  });

  return { visibleText, meta, jsonLd, inlineJSON };
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
    const scraped = await scrapeWithJsdom(url);

    // -------- GPT: Extract product data --------
    const extractPrompt = `
Extract factual product data.
Use structured data if available. No guessing. JSON only.

Meta tags:
${JSON.stringify(scraped.meta)}

JSON-LD:
${JSON.stringify(scraped.jsonLd)}

Inline JSON:
${JSON.stringify(scraped.inlineJSON)}

Visible text:
"""${scraped.visibleText}"""

Respond:
{
  "productTitle": "string | null",
  "price": "string | null",
  "seller": "string | null",
  "brand": "string | null"
}`;

    const extractResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: extractPrompt }],
    });

    const pageData = safeJSONParse(
      extractResp.choices[0].message.content,
      {}
    );

    // -------- GPT: Evaluate website trust --------
    const trustPrompt = `
Evaluate website trustworthiness from technical signals only.
Do NOT use reviews. JSON only.

Website data:
${JSON.stringify(domainSignals)}

Respond JSON:
{
  "trustScore": 1 | 2 | 3 | 4 | 5,
  "confidence": "high" | "medium" | "low",
  "reasoning": "string"
}`;

    const trustResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: trustPrompt }],
    });

    const siteTrust = safeJSONParse(
      trustResp.choices[0].message.content,
      {}
    );

    return new Response(
      JSON.stringify({
        aiResult: {
          websiteTrustScore: siteTrust.trustScore || 3,
          websiteReasoning:
            siteTrust.reasoning || "Insufficient data.",
          websiteConfidence: siteTrust.confidence || "low",
          productTitle: pageData.productTitle || null,
          price: pageData.price || null,
          seller: pageData.seller || null,
          brand: pageData.brand || null,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500 }
    );
  }
}
