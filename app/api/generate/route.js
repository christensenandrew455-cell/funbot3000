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

// --- SAFE JSON PARSER (CRITICAL FIX) ---
function safeJsonParse(text) {
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

/**
 * Extract readable + structured page data
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

    // JSON-LD (most reliable)
    document
      .querySelectorAll("script[type='application/ld+json']")
      .forEach((el) => {
        const json = el.textContent?.trim();
        if (json && json.length > 20) {
          parts.push(`STRUCTURED_DATA: ${json}`);
        }
      });

    document
      .querySelectorAll(
        "script:not([type='application/ld+json']), style, noscript"
      )
      .forEach((el) => el.remove());

    const metaTitle =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="title"]')?.content;
    if (metaTitle) parts.push(`META_TITLE: ${metaTitle}`);

    if (document.title) {
      parts.push(`PAGE_TITLE: ${document.title}`);
    }

    document.querySelectorAll("h1, h2").forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 5) {
        parts.push(`HEADING: ${text}`);
      }
    });

    parts.push(document.body?.textContent || "");

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

    // --- AI STEP 1: PAGE UNDERSTANDING ---
    const pageText = await extractPageText(url);
    let pageUnderstanding = null;

    if (pageText) {
      const pageCompletion =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content: `
You are a product page parser.
Return JSON ONLY. No markdown.

Webpage:
"""${pageText}"""

{
  "isProductPage": true | false,
  "productTitle": "string | null",
  "price": "string | null",
  "seller": "string | null",
  "productType": "string | null"
}
`,
            },
          ],
        });

      pageUnderstanding = safeJsonParse(
        pageCompletion.choices[0].message.content
      );
    }

    // --- AI STEP 2: SCAM ANALYSIS ---
    const scamCompletion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: `
Return JSON ONLY. No markdown.

{
  "status": "good" | "bad",
  "review": "string",
  "sellerTrust": "high" | "medium" | "low",
  "confidence": "high" | "medium" | "low",
  "alternative": "string | null"
}

Context:
URL: ${url}
Domain: ${domain}
Domain age: ${domainAgeDays ?? "unknown"}
Trust score: ${websiteTrustScore}
Product title: ${pageUnderstanding?.productTitle ?? "unknown"}
Seller: ${pageUnderstanding?.seller ?? "unknown"}
`,
          },
        ],
      });

    const aiResult = safeJsonParse(
      scamCompletion.choices[0].message.content
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
