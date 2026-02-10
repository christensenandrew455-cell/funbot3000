import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== CORE SEARCH ===================== */

async function webSearch(query) {
  const openai = getClient();
  if (!openai || !query) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: `
Find neutral, independent information.

Focus on:
- price vs quality reputation
- general customer experience
- seller reliability

Query:
${query}

Return ONE short factual paragraph.
No conclusions. No scoring.
`,
    });

    return res.output_text || null;
  } catch {
    return null;
  }
}

/* ===================== PUBLIC ===================== */

export async function searchBrandEvidence(brand) {
  return brand
    ? webSearch(`${brand} product quality reputation pricing`)
    : null;
}

export async function searchSellerEvidence({ seller, platform }) {
  const subject = seller || platform;
  return subject
    ? webSearch(`${subject} seller reviews customer experience`)
    : null;
}
