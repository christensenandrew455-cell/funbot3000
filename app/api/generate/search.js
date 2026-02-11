import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== WEB SEARCH (FACTS ONLY) ===================== */

async function gptSearch(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

function safeJSON(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/* ===================== PUBLIC ===================== */

/**
 * Gather neutral factual signals only.
 * NO judgement. NO scoring.
 */
export async function gatherFacts({ brand, product, seller }) {
  if (!product) return null;

  const text = await gptSearch(`
Collect neutral factual information. Do NOT judge or conclude.

Product:
${brand ? brand + " " : ""}${product}

Seller:
${seller || "unknown"}

Focus on:
- delivery reliability
- authenticity / swaps
- refurb or used issues
- customer support availability
- typical market price context

Return JSON only:
{
  "deliveryIssues": string[],
  "authenticityIssues": string[],
  "qualityIssues": string[],
  "supportIssues": string[],
  "priceContext": string,
  "nonDeliveryRisk": boolean
}
`);

  return safeJSON(text);
}
