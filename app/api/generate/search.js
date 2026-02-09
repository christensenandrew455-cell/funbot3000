import fetch from "node-fetch";

/* ===================== CONFIG ===================== */

const BRAVE_API_KEY =
  process.env.BRAVE_API_KEY ||
  process.env.BRAVE_SEARCH_API_KEY ||
  process.env.BRAVE_SEARCH_KEY;

// Brave free tier: 1 request / second
const MIN_INTERVAL_MS = 1100;

/* ===================== STATE ===================== */

// In-memory cache (best-effort on serverless)
const cache = new Map();

// Global throttle state (shared per runtime)
let lastRequestTime = 0;
let queue = Promise.resolve();

/* ===================== HELPERS ===================== */

export function isBraveConfigured() {
  return Boolean(BRAVE_API_KEY);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures Brave requests run sequentially
 * and never exceed 1 request / second.
 */
function enqueueBraveRequest(fn) {
  queue = queue.then(async () => {
    const now = Date.now();
    const delta = now - lastRequestTime;

    if (delta < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - delta);
    }

    lastRequestTime = Date.now();
    return fn();
  });

  return queue;
}

/* ===================== CORE SEARCH ===================== */

async function braveSearch(query, count = 7) {
  if (!query || !BRAVE_API_KEY) return null;

  const key = `${query}:${count}`;
  if (cache.has(key)) return cache.get(key);

  return enqueueBraveRequest(async () => {
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

      // ---- RATE LIMIT HANDLING ----
      if (res.status === 429) {
        // Optional: inspect headers during debugging
        // console.warn("Brave 429", {
        //   remaining: res.headers.get("x-ratelimit-remaining"),
        //   limit: res.headers.get("x-ratelimit-limit"),
        // });

        // Fallback to cache if available
        return cache.get(key) || null;
      }

      if (!res.ok) return null;

      const data = await res.json();

      const results = (data?.web?.results || []).filter(
        r => !r.is_ad && r.type !== "ad"
      );

      cache.set(key, results);
      return results;
    } catch {
      return null;
    }
  });
}

function extractEvidence(results) {
  if (!results?.length) return null;

  const snippets = results
    .filter(r => r.snippet && r.snippet.length > 50)
    .map(r => r.snippet);

  return snippets.length ? snippets.join("\n") : null;
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
