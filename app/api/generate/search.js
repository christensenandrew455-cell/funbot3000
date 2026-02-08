import fetch from "node-fetch";

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
