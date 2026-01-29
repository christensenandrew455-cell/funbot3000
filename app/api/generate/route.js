export const runtime = "nodejs";

import { OpenAI } from "openai";
import { screenshotPage } from "@/lib/server/screenshot";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ----------------- Helpers ----------------- */
function safeJSONParse(text, fallback = {}) {
  try {
    const cleaned = text
      ?.replace(/```json/gi, "")
      ?.replace(/```/g, "")
      ?.match(/\{[\s\S]*\}/)?.[0];
    return cleaned ? JSON.parse(cleaned) : fallback;
  } catch {
    return fallback;
  }
}

/* ----------------- Brave Search ----------------- */
async function braveSearch(query, size = 5) {
  if (!query || !BRAVE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/v1/web/search?q=${encodeURIComponent(query)}&size=${size}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    const domain = new URL(url).hostname;

    /* 1) Capture screenshot */
    const screenshotBase64 = await screenshotPage(url, {
      hideSelectors: domain.includes("amazon.com")
        ? ".a-popover,.glow-toaster,.a-declarative,.nav-main,.nav-flyout"
        : "",
    });

    /* 2) Extract product info via AI using screenshot */
    const extractPrompt = `
You are analyzing a product page.

Product URL: ${url}
Website domain: ${domain}

Using the screenshot, extract:
- product title
- seller or brand
- price
- main features
- star rating (1–5)
- review count

Return JSON ONLY:
{
  "title": string,
  "seller": string,
  "price": string,
  "features": string[],
  "stars": number,
  "reviewCount": number
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: extractPrompt },
            { type: "input_image", image_url: `data:image/png;base64,${screenshotBase64}` },
          ],
        },
      ],
      temperature: 0,
    });

    const extractText = extractResponse.output?.[0]?.content?.[0]?.text || "";
    const productInfo = safeJSONParse(extractText, {});

    /* 3) General knowledge about seller/domain */
    const knowledgePrompt = `
You are a product trust evaluator AI.
Based on your general knowledge, answer the following:

Seller: "${productInfo.seller || "Unknown"}"
Domain: "${domain}"

Return JSON ONLY:
{
  "sellerKnown": boolean,
  "sellerTrust": { "score": 1-5, "reason": string } | null,
  "domainKnown": boolean,
  "websiteTrust": { "score": 1-5, "reason": string } | null
}
`;

    const knowledgeResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: knowledgePrompt,
      temperature: 0,
    });

    const knowledgeText = knowledgeResponse.output?.[0]?.content?.[0]?.text || "{}";
    const knowledgeData = safeJSONParse(knowledgeText, {});

    /* 4) Web searches if unknown */
    let sellerResults = [];
    let domainResults = [];

    if (!knowledgeData.sellerKnown && productInfo.seller) {
      sellerResults = await braveSearch(
        `"${productInfo.seller}" reviews OR complaint OR scam OR fraud OR "customer feedback"`,
        7
      );
    }

    if (!knowledgeData.domainKnown) {
      domainResults = await braveSearch(
        `"${domain}" scam OR fraud OR legit OR review OR "customer complaint"`,
        7
      );
    }

    const productResults = await braveSearch(
      `"${productInfo.title}" reviews OR rating OR complaint OR fake OR scam OR refund OR defect OR broken`,
      7
    );

    const formatResults = (arr) =>
      arr
        .map(
          (r, i) =>
            `Result ${i + 1}:\n- Title: ${r.title}\n- URL: ${r.url}\n- Snippet: ${r.snippet || "N/A"}`
        )
        .join("\n\n");

    /* 5) Final trust evaluation via AI */
    const finalPrompt = `
You are a product trust evaluator AI.

Use:
- General knowledge (sellerKnown/domainKnown)
- Seller/domain web search results (if unknown)
- Product review and issue searches
- Product screenshot data

Product URL: ${url}
Domain: ${domain}
Product info: ${JSON.stringify(productInfo, null, 2)}
General knowledge: ${JSON.stringify(knowledgeData, null, 2)}

Seller search results:
${formatResults(sellerResults) || "None"}

Domain search results:
${formatResults(domainResults) || "None"}

Product search results:
${formatResults(productResults) || "None"}

Evaluate the trustworthiness of:
- the website
- the seller
- the product

Return JSON ONLY:
{
  "title": string,
  "status": "good" | "bad",
  "websiteTrust": { "score": 1-5, "reason": string },
  "sellerTrust": { "score": 1-5, "reason": string },
  "productTrust": { "score": 1-5, "reason": string },
  "overall": { "score": 1-5, "reason": string },
  "alternative": { "title": string, "url": string, "price": string, "seller": string } | null
}
`;

    const finalResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: finalPrompt,
      temperature: 0.1,
    });

    const finalText = finalResponse.output?.[0]?.content?.[0]?.text || "{}";
    const evaluation = safeJSONParse(finalText, {});

    /* 6) Return screenshot + AI evaluation together */
    return new Response(
      JSON.stringify({ base64: screenshotBase64, aiResult: evaluation }),
      { status: 200 }
    );

  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
