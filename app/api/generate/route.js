export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";
import { JSDOM } from "jsdom";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

/**
 * Extract readable + structured page data for AI understanding
 */
async function extractPageText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProductAnalyzer/1.0)",
      },
    });

    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const parts = [];

    // ---- JSON-LD PRODUCT DATA (MOST IMPORTANT) ----
    document
      .querySelectorAll("script[type='application/ld+json']")
      .forEach((el) => {
        const json = el.textContent?.trim();
        if (json && json.length > 20) {
          parts.push(`STRUCTURED_DATA: ${json}`);
        }
      });

    // Remove noisy elements (keep JSON-LD)
    document
      .querySelectorAll(
        "script:not([type='application/ld+json']), style, noscript"
      )
      .forEach((el) => el.remove());

    // Meta title
    const metaTitle =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="title"]')?.content;
    if (metaTitle) parts.push(`META_TITLE: ${metaTitle}`);

    // Page title
    if (document.title) {
      parts.push(`PAGE_TITLE: ${document.title}`);
    }

    // Headings (often product names)
    document.querySelectorAll("h1, h2").forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 5) {
        parts.push(`HEADING: ${text}`);
      }
    });

    // Body text fallback
    const bodyText = document.body?.textContent || "";
    parts.push(bodyText);

    return parts
      .join("\n")
      .replace(/\s+/g, " ")
      .slice(0, 15000);
  } catch {
    return null;
  }
}

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

    // ---- WEBSITE HEURISTICS ----
    let websiteTrustScore = 50;
    const flags = [];

    if (domainAgeDays !== null) {
      if (domainAgeDays < 180) {
        websiteTrustScore -= 30;
        flags.push("Domain registered recently");
      } else if (domainAgeDays > 1825) {
        websiteTrustScore += 20;
      }
    }

    // ---- AI STEP 1: PAGE UNDERSTANDING ----
    const pageText = await extractPageText(url);
    let pageUnderstanding = null;

    if (pageText) {
      const pagePrompt = `
You are a product page parser.

Rules:
- Do NOT guess
- Prefer structured data if present
- If information is missing, return null
- Output JSON ONLY

Webpage content:
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

      const pageCompletion =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: pagePrompt }],
        });

      pageUnderstanding = JSON.parse(
        pageCompletion.choices[0].message.content
      );
    }

    // ---- AI STEP 2: SCAM ANALYSIS ----
    const scamPrompt = `
You are an e-commerce risk analyst.

Given:
- Product URL: ${url}
- Domain: ${domain}
- Domain age (days): ${domainAgeDays ?? "unknown"}
- Website trust score: ${websiteTrustScore}/100
- Flags: ${flags.join(", ") || "none"}

Product understanding:
- Product title: ${pageUnderstanding?.productTitle ?? "unknown"}
- Product type: ${pageUnderstanding?.productType ?? "unknown"}
- Seller: ${pageUnderstanding?.seller ?? "unknown"}

Rules:
- Do NOT invent facts
- Be conservative
- Use probabilistic language
- Output JSON ONLY

Respond:
{
  "status": "good" | "bad",
  "review": "string",
  "sellerTrust": "high" | "medium" | "low",
  "confidence": "high" | "medium" | "low",
  "alternative": "string | null"
}
`;

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: scamPrompt }],
      });

    const aiResult = JSON.parse(
      completion.choices[0].message.content
    );

    return new Response(
      JSON.stringify({
        aiResult: {
          ...aiResult,
          domain,
          websiteTrustScore,
          pageUnderstanding,
        },
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
