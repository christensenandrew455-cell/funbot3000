import fetch from "node-fetch";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const braveCache = new Map();

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
    const results = data?.web?.results || [];

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

/* ===================== REPUTATION ===================== */

export async function getSearchSnippets(query) {
  const results = await braveSearch(query, 6);
  if (!results.length) return null;

  return results
    .filter(
      r =>
        r.snippet &&
        r.snippet.length > 50 &&
        !/coupon|deal|buy now|% off/i.test(r.snippet)
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

/* ===================== PRICE ===================== */

export async function getMarketPrice(productTitle) {
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

  if (!prices.length) return null;
  prices.sort((a, b) => a - b);
  return prices[Math.floor(prices.length / 2)];
}
