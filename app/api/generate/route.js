export const runtime = "nodejs";

import { OpenAI } from "openai";
import { screenshotPage } from "@/lib/server/screenshot";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

async function braveSearch(query, size = 5) {
  if (!query || !BRAVE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/v1/web/search?q=${encodeURIComponent(query)}&size=${size}`,
      { headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

async function gptSearchPreview(query) {
  try {
    const resp = await openai.responses.create({
      model: "gpt-4o-mini-search-preview",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: `Search the web for factual info about: "${query}". Return top results in JSON [{title,url,snippet}]` }],
        },
      ],
    });
    const text = resp.output?.[0]?.content?.[0]?.text || "[]";
    return safeJSONParse(text, []);
  } catch {
    return null;
  }
}

const formatResults = (arr) =>
  arr
    .map((r, i) => `Result ${i + 1}:\nTitle: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet || "N/A"}`)
    .join("\n\n");

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    const domain = new URL(url).hostname;

    /* 1) Screenshot */
    const screenshotBase64 = await screenshotPage(url, {
      hideSelectors: domain.includes("amazon.com")
        ? ".a-popover,.glow-toaster,.a-declarative,.nav-main,.nav-flyout"
        : "",
    });

    /* 2) PRODUCT EXTRACTION — GPT-4o-mini using URL + screenshot */
    const extractPrompt = `
Extract factual info from this product page.

Hints:
- URL: ${url}, domain: ${domain}
- Use visible text from the screenshot if needed
- Return null only if impossible

Return JSON ONLY:
{
  "title": string | null,
  "seller": string | null,
  "price": string | null,
  "features": string[],
  "stars": number | null,
  "reviewCount": number | null
}
`;

    const extractResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: extractPrompt },
            { type: "input_image", image_url: `data:image/png;base64,${screenshotBase64}` },
          ],
        },
      ],
    });

    const extractText = extractResponse.output?.[0]?.content?.[0]?.text || "{}";
    const productInfo = safeJSONParse(extractText, { features: [] });

    console.log("PRODUCT INFO:", productInfo);

    /* 3) SEARCH (GPT + Brave fallback) */
    let sellerResults = [], domainResults = [], productResults = [];

    if (productInfo.seller) {
      sellerResults =
        (await gptSearchPreview(`"${productInfo.seller}" reviews OR complaint OR scam OR fraud`)) ||
        (await braveSearch(`"${productInfo.seller}" reviews OR complaint OR scam OR fraud`, 7));
    }

    domainResults =
      (await gptSearchPreview(`"${domain}" scam OR fraud OR legit OR review`)) ||
      (await braveSearch(`"${domain}" scam OR fraud OR legit OR review`, 7));

    if (productInfo.title) {
      productResults =
        (await gptSearchPreview(`"${productInfo.title}" reviews OR defect OR broken OR fake`)) ||
        (await braveSearch(`"${productInfo.title}" reviews OR defect OR broken OR fake`, 7));
    }

    console.log("Seller Results:", sellerResults);
    console.log("Domain Results:", domainResults);
    console.log("Product Results:", productResults);

    /* 4) STRUCTURE EVIDENCE manually */
    const structuredEvidence = {
      seller_issues: sellerResults.map(r => ({ issue: r.snippet || "N/A", frequency: "medium", severity: "medium" })),
      domain_issues: domainResults.map(r => ({ issue: r.snippet || "N/A", frequency: "medium", severity: "medium" })),
      product_issues: productResults.map(r => ({ issue: r.snippet || "N/A", frequency: "medium", severity: "medium" })),
      positive_signals: [],
      evidence_strength: "moderate",
    };

    console.log("Structured Evidence:", structuredEvidence);

    /* 5) FINAL JUDGMENT — GPT-4.1 */
    const finalPrompt = `
You are a conservative product trust evaluator.

Rules:
- Base conclusions ONLY on provided evidence
- Penalize missing or weak data
- If evidence is weak, mark status as "uncertain"
- Be skeptical by default

Product info:
${JSON.stringify(productInfo, null, 2)}

Structured evidence:
${JSON.stringify(structuredEvidence, null, 2)}

Return JSON ONLY:
{
  "title": string,
  "status": "good" | "bad" | "uncertain",
  "websiteTrust": { "score": 1-5, "reason": string },
  "sellerTrust": { "score": 1-5, "reason": string },
  "productTrust": { "score": 1-5, "reason": string },
  "overall": { "score": 1-5, "reason": string }
}
`;

    const finalResponse = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "user", content: [{ type: "input_text", text: finalPrompt }] }
      ],
    });

    const finalText = finalResponse.output?.[0]?.content?.[0]?.text || "{}";
    const evaluation = safeJSONParse(finalText, {});

    console.log("Final Evaluation:", evaluation);

    /* 6) RESPONSE */
    return new Response(
      JSON.stringify({
        base64: screenshotBase64,
        aiResult: evaluation,
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
