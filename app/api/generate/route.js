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
    return "unknown";
  }
}

/* ----------------- DOMAIN SIGNALS ----------------- */
async function getDomainSignals(domain) {
  try {
    const data = await Promise.race([
      whois(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("WHOIS timeout")), 5000)
      ),
    ]);

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

/* ----------------- SCRAPER ----------------- */
async function scrapeWithJsdom(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error("Fetch failed");

  const html = await res.text();
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const visibleText =
    document.body?.textContent?.replace(/\s+/g, " ").trim().slice(0, 6000) ||
    "";

  const meta = {};
  document.querySelectorAll("meta").forEach((m) => {
    const name = m.getAttribute("property") || m.getAttribute("name");
    const content = m.getAttribute("content");
    if (name && content) meta[name] = content;
  });

  const jsonLd = [];
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((s) => {
      try {
        jsonLd.push(JSON.parse(s.textContent));
      } catch {}
    });

  return { visibleText, meta, jsonLd };
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

    const domain = getDomain(url);
    const domainSignals = await getDomainSignals(domain);
    const scraped = await scrapeWithJsdom(url);

    /* ---------- GPT: FULL STRUCTURED EVAL ---------- */
    const evalPrompt = `
You are a product trust analysis system.

Use ONLY the provided data. No reviews. No guessing.
Be strict. Scores must be 1–5.

Domain signals:
${JSON.stringify(domainSignals)}

Meta data:
${JSON.stringify(scraped.meta)}

Structured data:
${JSON.stringify(scraped.jsonLd)}

Visible page text:
"""${scraped.visibleText}"""

Return JSON only:

{
  "title": "string | null",
  "status": "good" | "bad",

  "websiteTrust": {
    "score": 1 | 2 | 3 | 4 | 5,
    "reason": "string"
  },

  "sellerTrust": {
    "score": 1 | 2 | 3 | 4 | 5,
    "reason": "string"
  },

  "productTrust": {
    "score": 1 | 2 | 3 | 4 | 5,
    "reason": "string"
  },

  "overall": {
    "score": 1 | 2 | 3 | 4 | 5,
    "reason": "string"
  },

  "alternative": "string | null"
}
`;

    const gptResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.2,
    });

    const evaluation = safeJSONParse(
      gptResp.choices[0].message.content,
      {}
    );

    return new Response(
      JSON.stringify({ aiResult: evaluation }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
}
