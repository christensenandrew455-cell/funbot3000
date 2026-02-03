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

const formatResults = (arr) =>
  arr
    .map(
      (r, i) =>
        `Result ${i + 1}:
Title: ${r.title}
URL: ${r.url}
Snippet: ${r.snippet || "N/A"}`
    )
    .join("\n\n");

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const domain = new URL(url).hostname;

    /* 1) Screenshot */
    const screenshotBase64 = await screenshotPage(url, {
      hideSelectors: domain.includes("amazon.com")
        ? ".a-popover,.glow-toaster,.a-declarative,.nav-main,.nav-flyout"
        : "",
    });

    /* 2) PRODUCT EXTRACTION — gpt-4o-mini (vision) */
    const extractPrompt = `
You are extracting factual information from a product page screenshot.

Extract ONLY what is visible.
Do not guess.

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
            {
              type: "input_image",
              image_url: `data:image/png;base64,${screenshotBase64}`,
            },
          ],
        },
      ],
      temperature: 0,
    });

    const extractText =
      extractResponse.output?.[0]?.content?.[0]?.text || "{}";

    const productInfo = safeJSONParse(extractText, {});

    /* 3) ALWAYS SEARCH (no assumptions) */
    const sellerResults = productInfo.seller
      ? await braveSearch(
          `"${productInfo.seller}" reviews OR complaint OR scam OR fraud`,
          7
        )
      : [];

    const domainResults = await braveSearch(
      `"${domain}" scam OR fraud OR legit OR review`,
      7
    );

    const productResults = productInfo.title
      ? await braveSearch(
          `"${productInfo.title}" reviews OR defect OR broken OR fake`,
          7
        )
      : [];

    /* 4) STRUCTURE EVIDENCE — o4-mini */
    const structurePrompt = `
You are structuring evidence for a trust evaluation system.

Rules:
- Do NOT judge trust
- Extract factual issues and positives only
- Group similar claims

Seller results:
${formatResults(sellerResults) || "None"}

Domain results:
${formatResults(domainResults) || "None"}

Product results:
${formatResults(productResults) || "None"}

Return JSON ONLY:
{
  "seller_issues": [{ "issue": string, "frequency": "low|medium|high", "severity": "low|medium|high" }],
  "domain_issues": [{ "issue": string, "frequency": "low|medium|high", "severity": "low|medium|high" }],
  "product_issues": [{ "issue": string, "frequency": "low|medium|high", "severity": "low|medium|high" }],
  "positive_signals": string[],
  "evidence_strength": "weak|moderate|strong"
}
`;

    const structuredResponse = await openai.responses.create({
      model: "o4-mini",
      input: structurePrompt,
      temperature: 0,
    });

    const structuredText =
      structuredResponse.output?.[0]?.content?.[0]?.text || "{}";

    const structuredEvidence = safeJSONParse(structuredText, {});

    /* 5) FINAL JUDGMENT — gpt-4.1 (reasoning) */
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
      input: finalPrompt,
      temperature: 0.1,
    });

    const finalText =
      finalResponse.output?.[0]?.content?.[0]?.text || "{}";

    const evaluation = safeJSONParse(finalText, {});

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
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
