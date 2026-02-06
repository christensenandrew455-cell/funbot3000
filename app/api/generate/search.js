import fetch from "node-fetch";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const braveCache = new Map();

/* ===================== CONFIG ===================== */

export function isBraveConfigured() {
  return Boolean(BRAVE_API_KEY);
}

/* ===================== BRAVE SEARCH ===================== */

export async function braveSearch(query, count = 7) {
  if (!query || !BRAVE_API_KEY) return [];

  const cacheKey = `${query}:${count}`;
  if (braveCache.has(cacheKey)) return braveCache.get(cacheKey);

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query
      )}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();

    // Organic only (no ads)
    const results = (data?.web?.results || []).filter(
      r => !r.is_ad && r.type !== "ad"
    );

    braveCache.set(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

/* ===================== HELPERS ===================== */

function safeJSONParse(text, fallback = {}) {
  try {
    const match = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

function getResponseText(res) {
  if (res.output_text) return res.output_text;
  for (const msg of res.output || []) {
    for (const c of msg.content || []) {
      if (c.text) return c.text;
    }
  }
  return "";
}

/* ===================== CATEGORY ===================== */

export async function aiInferCategory(simplifiedTitle) {
  if (!simplifiedTitle) return null;

  const prompt = `
Given the product name below, determine the most appropriate product category.

Product:
${simplifiedTitle}

Return JSON ONLY:
{ "category": string }
`;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const parsed = safeJSONParse(getResponseText(res), {});
  return typeof parsed.category === "string" ? parsed.category : null;
}

/* ===================== REPUTATION ===================== */

export async function getSearchSnippets(query) {
  const results = await braveSearch(query, 6);
  if (!results.length) return null;

  return results
    .filter(
      r =>
        r.snippet &&
        r.snippet.length > 60 &&
        !/coupon|deal|buy now|% off|sponsored/i.test(r.snippet)
    )
    .map(r => `${r.title || ""} — ${r.snippet || ""}`)
    .join("\n");
}

export async function aiScaleReputation(text, subject) {
  if (!text) return null;

  const prompt = `
Rate the trustworthiness of the following ${subject}.
Scale from 1 (bad/untrustworthy) to 5 (good/trustworthy).

Text:
${text}

Return JSON ONLY:
{ "score": number }
`;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const parsed = safeJSONParse(getResponseText(res), {});
  return typeof parsed.score === "number" ? parsed.score : null;
}

/* ===================== MARKET PRICE (AI-INFERRED) ===================== */

export async function getMarketPriceRange(productTitle, category = null) {
  if (!productTitle) return null;

  const prompt = `
Estimate the typical online market price range for the product below.
Assume common retailers (Amazon, Walmart, Target, etc).
Do NOT guess extreme values.

Product:
${productTitle}
Category:
${category || "unknown"}

Return JSON ONLY:
{
  "min": number,
  "max": number,
  "median": number
}
`;

  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: prompt,
  });

  const parsed = safeJSONParse(getResponseText(res), null);

  if (
    !parsed ||
    typeof parsed.min !== "number" ||
    typeof parsed.max !== "number" ||
    typeof parsed.median !== "number"
  ) {
    return null;
  }

  return {
    min: parsed.min,
    max: parsed.max,
    median: parsed.median,
  };
}
