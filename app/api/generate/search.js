import fetch from "node-fetch";

const BRAVE_API_KEY =
  process.env.BRAVE_API_KEY ||
  process.env.BRAVE_SEARCH_API_KEY ||
  process.env.BRAVE_SEARCH_KEY;

const cache = new Map();

/* ===================== CORE SEARCH ===================== */

export function isBraveConfigured() {
  return Boolean(BRAVE_API_KEY);
}

async function braveSearch(query, count = 7) {
  if (!query || !BRAVE_API_KEY) return [];

  const key = `${query}:${count}`;
  if (cache.has(key)) return cache.get(key);

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
    const results = (data?.web?.results || []).filter(
      r => !r.is_ad && r.type !== "ad"
    );

    cache.set(key, results);
    return results;
  } catch {
    return [];
  }
}

function extractEvidence(results) {
  if (!results?.length) return null;

  const snippets = results
    .filter(r => r.snippet && r.snippet.length > 50)
    .map(r => r.snippet);

  return snippets.join("\n");
}

/* ===================== BRAND INTELLIGENCE ===================== */

export async function analyzeBrand(brandName) {
  if (!brandName) return null;

  const query = `"${brandName}" brand company manufacturer`;
  const results = await braveSearch(query, 6);
  const text = extractEvidence(results);

  if (!text) {
    return {
      exists: false,
      confidence: "low",
      summary: "No independent information found about this brand.",
      signals: { complaints: false, ecommerceBrand: false },
      rawText: null,
    };
  }

  const complaints = /scam|complaint|fake|ripoff/i.test(text);
  const ecommerceBrand = /shopify|amazon brand|online store/i.test(text);

  return {
    exists: true,
    confidence: complaints ? "low" : "medium",
    summary: complaints
      ? "Brand has reports of complaints or scam-related mentions."
      : "Brand appears to exist with limited independent information.",
    signals: {
      complaints,
      ecommerceBrand,
    },
    rawText: text,
  };
}

/* ===================== SELLER INTELLIGENCE ===================== */

export async function analyzeSeller({ seller, platform }) {
  const subject =
    seller || (platform ? `${platform} seller` : null);

  if (!subject) return null;

  const query = `"${subject}" seller reviews scam complaints`;
  const results = await braveSearch(query, 6);
  const text = extractEvidence(results);

  if (!text) {
    return {
      exists: false,
      confidence: "low",
      summary: "No independent seller information found.",
      signals: { complaints: false, marketplace: false },
      rawText: null,
    };
  }

  const complaints = /scam|fraud|complaint|ripoff/i.test(text);
  const marketplace = /amazon|etsy|walmart|ebay/i.test(text);

  return {
    exists: true,
    confidence: complaints ? "low" : "medium",
    summary: complaints
      ? "Seller has complaint or scam-related mentions."
      : "Seller appears to operate normally based on available information.",
    signals: {
      complaints,
      marketplace,
    },
    rawText: text,
  };
}
