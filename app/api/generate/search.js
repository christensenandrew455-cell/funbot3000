import fetch from "node-fetch";
import { OpenAI } from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const braveCache = new Map();

/* ===================== BRAVE SEARCH ===================== */

export async function braveSearch(query, count = 7) {
  console.log("[BRAVE SEARCH] query:", query);

  if (!query || !BRAVE_API_KEY) {
    console.log("[BRAVE SEARCH] skipped (missing query or API key)");
    return [];
  }

  const cacheKey = `${query}:${count}`;
  if (braveCache.has(cacheKey)) {
    console.log("[BRAVE SEARCH] cache hit");
    return braveCache.get(cacheKey);
  }

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

    if (!res.ok) {
      console.log("[BRAVE SEARCH] failed:", res.status);
      return [];
    }

    const data = await res.json();
    const results = data?.web?.results || [];

    console.log("[BRAVE SEARCH] results:", results.length);

    braveCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.error("[BRAVE SEARCH] error:", err);
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
  console.log("[AI CATEGORY] input:", simplifiedTitle);

  if (!simplifiedTitle) return null;

    const openai = getOpenAIClient();
  if (!openai) {
    console.log("[AI CATEGORY] skipped (missing OPENAI_API_KEY)");
    return null;
  }

  const prompt = `
Given the product name below, determine the most appropriate product category.

Product:
${simplifiedTitle}

Return JSON ONLY:
{ "category": string }
`;

  console.log("[AI CATEGORY] prompt:", prompt);

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const raw = getResponseText(res);
  console.log("[AI CATEGORY] raw response:", raw);

  const parsed = safeJSONParse(raw, {});
  console.log("[AI CATEGORY] parsed:", parsed);

  return typeof parsed.category === "string" ? parsed.category : null;
}

/* ===================== REPUTATION ===================== */

export async function getSearchSnippets(query) {
  console.log("[SNIPPETS] query:", query);

  const results = await braveSearch(query, 6);
  if (!results.length) {
    console.log("[SNIPPETS] no results");
    return null;
  }

  const text = results
    .filter(
      r =>
        r.snippet &&
        r.snippet.length > 50 &&
        !/coupon|deal|buy now|% off/i.test(r.snippet)
    )
    .map(r => `${r.title || ""} — ${r.snippet || ""}`)
    .join("\n");

  console.log("[SNIPPETS] length:", text.length);

  return text || null;
}

export async function aiScaleReputation(text, subject) {
  console.log(`[AI REPUTATION] subject: ${subject}`);
  console.log(`[AI REPUTATION] input length: ${text?.length}`);

  if (!text) return null;

    const openai = getOpenAIClient();
  if (!openai) {
    console.log("[AI REPUTATION] skipped (missing OPENAI_API_KEY)");
    return null;
  }

  const prompt = `
Rate the trustworthiness of the following ${subject}.
Scale from 1 (bad/untrustworthy) to 5 (good/trustworthy).

Text:
${text}

Return JSON ONLY:
{ "score": number }
`;

  console.log("[AI REPUTATION] prompt:", prompt);

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const raw = getResponseText(res);
  console.log("[AI REPUTATION] raw response:", raw);

  const parsed = safeJSONParse(raw, {});
  console.log("[AI REPUTATION] parsed:", parsed);

  return typeof parsed.score === "number" ? parsed.score : null;
}

/* ===================== PRICE ===================== */

export async function getMarketPriceRange(productTitle) {
  console.log("[PRICE RANGE] title:", productTitle);

  if (!productTitle) return null;

  const results = await braveSearch(`${productTitle} price`, 6);
  const prices = [];

  for (const r of results) {
    const text = `${r.title || ""} ${r.snippet || ""}`;
    const matches = text.match(/\$?\b\d{1,3}(\.\d{2})?\b/g);

    if (matches) {
      matches.forEach(p => {
        const n = parseFloat(p.replace("$", ""));
        if (n > 5 && n < 500) prices.push(n);
      });
    }
  }

  console.log("[PRICE RANGE] prices found:", prices);

  if (!prices.length) return null;

  prices.sort((a, b) => a - b);

  return {
    min: prices[0],
    max: prices[prices.length - 1],
    median: prices[Math.floor(prices.length / 2)],
  };
}
