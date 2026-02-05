export const runtime = "nodejs";

import fetch from "node-fetch";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ===================== BRAVE CACHE ===================== */

const braveCache = new Map();

/* ===================== HELPERS ===================== */

async function braveSearch(query, count = 7) {
  if (!query || !BRAVE_API_KEY) {
    console.error("Brave search skipped: missing query or API key");
    return [];
  }

  const cacheKey = `${query}:${count}`;
  if (braveCache.has(cacheKey)) {
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
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Brave error:", res.status, text);
      return [];
    }

    const data = await res.json();
    const results = data?.web?.results || [];

    braveCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.error("Brave fetch failed:", err);
    return [];
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

/* ===================== BRAND NORMALIZATION ===================== */

function normalizeBrand(raw) {
  if (!raw) return null;

  return raw
    .replace(/^(brand[:\s]+|visit the\s+|by\s+)/i, "")
    .replace(/\s+store$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ===================== SEARCH TRUST SIGNALS ===================== */

async function getSearchSnippets(query) {
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

async function aiScaleReputation(text, subject) {
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

function brandSellerMismatch(brand, seller) {
  if (!brand || !seller) return false;

  const b = brand.toLowerCase();
  const s = seller.toLowerCase();

  if (s.includes("amazon")) return false;
  return !s.includes(b);
}

/* ===================== PRICE INTELLIGENCE ===================== */

function simplifyTitle(title) {
  if (!title) return null;

  return title
    .toLowerCase()
    .replace(/amazon\.com|sports & outdoors/gi, "")
    .replace(/\|.*$/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(
      /\b(adjustable|multi[- ]?functional|foldable|portable|premium|professional|heavy[- ]?duty|lightweight|durable|ergonomic|advanced|smart|wireless|wired|usb|bluetooth|rechargeable|waterproof|universal)\b/g,
      ""
    )
    .replace(
      /\b(for|with|and|men|women|kids|children|adults|home|office|gym|outdoor|indoor|training|equipment)\b/g,
      ""
    )
    .replace(/\b\d+[-\w]*\b/g, "")
    .replace(/\s+/g, " ")
    .trim(); // FIX: stop slicing to last 3 words
}

async function getMarketPrice(productTitle) {
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

/* ===================== HTML EXTRACTOR ===================== */

async function extractFromHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      null;

    let price =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]').first().text() ||
      null;

    if (price) {
      const match = price.match(/\$?\d+(\.\d{2})?/);
      price = match ? match[0] : null;
    }

    let seller =
      $("#sellerProfileTriggerId").text() ||
      $("#bylineInfo").text() ||
      null;

    if (seller) seller = seller.replace(/\s+/g, " ").trim();

    let brand =
      $('[itemprop="brand"]').text() ||
      $('#productOverview_feature_div tr:contains("Brand") td').text() ||
      null;

    brand = normalizeBrand(brand);

    let claims = [];
    $("#feature-bullets li span").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) claims.push(text);
    });

    return {
      title,
      price,
      seller,
      brand,
      platform: new URL(url).hostname.replace("www.", ""),
      claims,
      source: "html",
    };
  } catch {
    return null;
  }
}

/* ===================== API ===================== */

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    let productInfo = await extractFromHTML(url);
    if (!productInfo?.title) {
      return new Response(
        JSON.stringify({ error: "Failed to extract product" }),
        { status: 400 }
      );
    }

    const simplifiedTitle = simplifyTitle(productInfo.title);

    // FIX: use simplifiedTitle for pricing
    const marketPrice = simplifiedTitle
      ? await getMarketPrice(simplifiedTitle)
      : null;

    productInfo.market = { simplifiedTitle, marketPrice };

    // FIX: brand-only reputation search with intent
    const productSearchText = productInfo.brand
      ? await getSearchSnippets(
          `"${productInfo.brand}" reviews reputation trust scam`
        )
      : null;

    const productReputationScore = productSearchText
      ? await aiScaleReputation(productSearchText, "brand")
      : null;

    // FIX: full seller name, not broken tokens
    const sellerSearchText = productInfo.seller
      ? await getSearchSnippets(
          `"${productInfo.seller}" amazon seller reviews complaints`
        )
      : null;

    const sellerReputationScore = sellerSearchText
      ? await aiScaleReputation(sellerSearchText, "seller")
      : null;

    const mismatch = brandSellerMismatch(
      productInfo.brand,
      productInfo.seller
    );

    const reasoningPrompt = `
Evaluate risk only.

Product:
${JSON.stringify(productInfo, null, 2)}

Return JSON ONLY:
{
  "scam": number,
  "overpriced": number,
  "dropship": number
}
`;

    const reasoningResponse = await openai.responses.create({
      model: "gpt-4o",
      input: reasoningPrompt,
    });

    const analysis = safeJSONParse(
      getResponseText(reasoningResponse),
      {}
    );

    const aiResult = {
      title: productInfo.title,

      sellerTrust: {
        score: mismatch
          ? 1
          : sellerReputationScore ?? 2,
        reason: mismatch
          ? "Seller does not match brand (dropship signal)."
          : sellerSearchText
          ? "External seller reputation found."
          : "No seller reputation found.",
      },

      productTrust: {
        score: productReputationScore ?? 2,
        reason: productSearchText
          ? "External brand reputation found."
          : "No external brand reputation found.",
      },

      overall: {
        score: Math.min(
          productReputationScore ?? 2,
          sellerReputationScore ?? 2,
          mismatch ? 1 : 5
        ),
        reason: "Brand, seller, and pricing signals combined.",
      },

      status:
        mismatch ||
        (productReputationScore !== null &&
          productReputationScore <= 2) ||
        (sellerReputationScore !== null &&
          sellerReputationScore <= 2)
          ? "bad"
          : "good",
    };

    return new Response(JSON.stringify({ base64: null, aiResult }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
