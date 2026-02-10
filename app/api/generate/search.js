import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/* ===================== CONFIG ===================== */

export function isSearchConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ===================== CORE ===================== */

/**
 * Performs a lightweight web search and returns
 * RAW TEXT EVIDENCE ONLY.
 * No reasoning. No scoring.
 */
async function webSearch(query) {
  if (!query) return null;

  const openai = getOpenAIClient();
  if (!openai) return null;

  const res = await openai.responses.create({
    model: "gpt-4o-mini-search-preview",
    input: `
Search the web for independent information.

Query:
${query}

Return ONLY a concise paragraph of factual findings.
No opinions. No conclusions.
`,
  });

  return res.output_text || null;
}

/* ===================== PUBLIC API ===================== */

export async function searchBrandEvidence(brand) {
  if (!brand) return null;
  return webSearch(`${brand} brand company manufacturer complaints`);
}

export async function searchSellerEvidence({ seller, platform }) {
  const subject = seller || platform;
  if (!subject) return null;
  return webSearch(`${subject} seller reviews scam complaints`);
}
