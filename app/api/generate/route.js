export const runtime = "nodejs";

import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ===================== HELPERS ===================== */

async function braveSearch(query, count = 7) {
  if (!query || !BRAVE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; DetestifyAI/1.0)",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );

    if (!res.ok) {
      console.error("Brave error:", res.status);
      return [];
    }

    const data = await res.json();
    return data?.web?.results || [];
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
    .trim()
    .split(" ")
    .slice(-3)
    .join(" ");
}

async function getMarketPrice(productTitle) {
  if (!productTitle) return null;

  // Only search for the product, not brand
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
        "User-Agent": "Mozilla/5.0",
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
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    let productInfo = await extractFromHTML(url);
    if (!productInfo?.title) {
      return new Response(JSON.stringify({ error: "Failed to extract product" }), { status: 400 });
    }

    const simplifiedTitle = simplifyTitle(productInfo.title);
    const marketPrice = simplifiedTitle
      ? await getMarketPrice(productInfo.title) // Only search product
      : null;

    productInfo.market = { simplifiedTitle, marketPrice };

    /* ===== BRAND + PRODUCT SEARCH ===== */
    const productSearchText = await getSearchSnippets(
      `${productInfo.brand} ${simplifiedTitle}`
    );

    const productReputationScore = productSearchText
      ? await aiScaleReputation(productSearchText, "product/brand")
      : 2;

    /* ===== SELLER SEARCH ===== */
    const sellerSearchText = productInfo.seller
      ? await getSearchSnippets(`${productInfo.seller} amazon seller reviews`)
      : null;

    const sellerReputationScore = sellerSearchText
      ? await aiScaleReputation(sellerSearchText, "seller")
      : 2;

    const mismatch = brandSellerMismatch(
      productInfo.brand,
      productInfo.seller
    );

    /* ===== AI ANALYSIS ===== */
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

    const analysis = safeJSONParse(getResponseText(reasoningResponse), {});

    const aiResult = {
      title: productInfo.title,

      sellerTrust: {
        score: mismatch ? 1 : Math.min(sellerReputationScore, analysis.dropship > 60 ? 2 : 5),
        reason: mismatch
          ? "Seller does not match brand (dropship signal)."
          : sellerSearchText
          ? "External seller reputation found."
          : "No seller reputation found.",
      },

      productTrust: {
        score: Math.min(
          productReputationScore,
          analysis.overpriced > 60 ? 2 : 5
        ),
        reason: productSearchText
          ? "External product/brand info found."
          : "No external product/brand info found.",
      },

      overall: {
        score: Math.min(
          productReputationScore,
          sellerReputationScore,
          mismatch ? 1 : 5
        ),
        reason: "Brand, seller, and pricing signals combined.",
      },

      status:
        mismatch ||
        productReputationScore <= 2 ||
        sellerReputationScore <= 2
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
