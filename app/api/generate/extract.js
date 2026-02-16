// app/api/generate/extract.js
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { OpenAI } from "openai";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function gptKnowledge(prompt) {
  const openai = getClient();
  if (!openai) return null;

  try {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });
    return res.output_text || null;
  } catch {
    return null;
  }
}

function safeJSON(text, fallback = null) {
  if (!text || typeof text !== "string") return fallback;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch {
    return fallback;
  }
}

/* ===================== NORMALIZATION ===================== */

export function normalizeBrand(raw) {
  if (!raw) return null;

  const normalized = raw
    .replace(/^(brand[:\s]+|visit the\s+|by\s+)/i, "")
    .replace(/\s+store$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (
    !normalized ||
    ["null", "undefined", "n/a", "na", "none", "unknown"].includes(normalized)
  ) {
    return null;
  }

  return normalized;
}

function normalizeEntity(value) {
  if (!value) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/^(null|undefined|n\/?a|none|unknown)$/i.test(normalized)) return null;
  return normalized;
}

function normalizeSeller(raw) {
  const v = normalizeEntity(raw);
  if (!v) return null;

  // Prefer a "Sold by X" chunk if present (Amazon merchant-info blobs)
  let s = v;
  const soldBy = s.match(/sold by\s+([^.\n\r|]+)\b/i);
  if (soldBy?.[1]) s = soldBy[1];

  s = s
    .replace(/ships from\s+[^.\n\r|]+/gi, "")
    .replace(/fulfilled by\s+[^.\n\r|]+/gi, "")
    .replace(/returns?[^.\n\r|]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeEntity(s);
}

function normalizeDomain(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function isAmazonContext(domain, seller) {
  const d = normalizeDomain(domain);
  const s = (seller || "").toLowerCase();
  // Your rule: if seller is Amazon.com => auto match
  if (s.includes("amazon.com") || s === "amazon") return true;
  // Also treat amazon storefront context as “Amazon context”
  if (d.includes("amazon.")) return true;
  return false;
}

/* ===================== PRICE HELPERS ===================== */

function parsePriceToNumber(v) {
  if (v === null || v === undefined) return null;

  // keep digits, comma, dot; remove currency + words
  const s = String(v)
    .replace(/[^\d.,]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!s) return null;

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatPriceDisplay(n, currencySymbol = "$") {
  if (!Number.isFinite(n)) return null;
  return `${currencySymbol}${n.toFixed(2)}`;
}

/* ===================== JSON-LD HELPERS ===================== */

function collectJsonLdNodes(value, nodes) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => collectJsonLdNodes(v, nodes));
    return;
  }
  if (typeof value === "object") {
    nodes.push(value);
    if (value["@graph"]) collectJsonLdNodes(value["@graph"], nodes);
  }
}

function findJsonLdProduct($) {
  const nodes = [];

  $("script[type='application/ld+json']").each((_, el) => {
    const text = $(el).text();
    if (!text) return;
    try {
      collectJsonLdNodes(JSON.parse(text), nodes);
    } catch {}
  });

  return nodes.find((node) => {
    const type = node?.["@type"];
    if (!type) return false;
    if (Array.isArray(type)) return type.includes("Product");
    return type === "Product";
  });
}

function getJsonLdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value?.name === "string") return value.name;
  return null;
}

function pickJsonLdOffer(offers) {
  if (!offers) return null;
  if (!Array.isArray(offers)) return offers;

  for (const o of offers) {
    const p = o?.price ?? o?.priceSpecification?.price;
    if (p !== undefined && p !== null) return o;
  }
  return offers[0] || null;
}

/* ===================== AI STEP (MATCH + SIMPLIFY) ===================== */
/**
 * Inputs: rawTitle, brand, seller, domain
 * Outputs:
 *  - sellerMatchesBrand: "yes" | "no"
 *  - brandSimple: string|null
 *  - product: string|null (generic category)
 */
async function aiMatchAndSimplify({ rawTitle, brand, seller, domain }) {
  // Amazon override
  if (isAmazonContext(domain, seller)) {
    const text = await gptKnowledge(`
You are simplifying an ecommerce product title.

Title:
${rawTitle}

Return JSON only:
{
  "brandSimple": "short brand / product line name people use (lowercase)",
  "product": "generic product category (lowercase, object type only)"
}

Rules:
- Remove SEO fluff, condition notes, shipping terms, and seller names.
- Keep it short.
- Use lowercase.
`);
    const parsed = safeJSON(text, null);
    return {
      sellerMatchesBrand: "yes",
      brandSimple:
        typeof parsed?.brandSimple === "string" ? parsed.brandSimple.trim() : null,
      product: typeof parsed?.product === "string" ? parsed.product.trim() : null,
    };
  }

  const prompt = `
You do TWO tasks.

Task A: Seller matches brand?
Brand:
${brand || "unknown"}

Seller:
${seller || "unknown"}

Return "yes" only if the seller name clearly looks like the official brand storefront, official store name, or the brand itself.
Otherwise return "no".
Return strictly yes/no in the JSON field only.

Task B: Simplify the title.
Title:
${rawTitle}

Return JSON only:
{
  "sellerMatchesBrand": "yes or no",
  "brandSimple": "short brand / product line name people use (lowercase)",
  "product": "generic product category (lowercase, object type only)"
}

Rules for B:
- Remove marketing fluff/SEO terms, condition notes, and model numbers unless they define the family name.
- brandSimple should be how people refer to the product line (e.g., "apple airpods"), not the seller.
- product must be the generic object type only (e.g., "earbuds", "laptop", "smartwatch").
- Use lowercase.
`;

  const text = await gptKnowledge(prompt);
  const parsed = safeJSON(text, null);

  const yn = String(parsed?.sellerMatchesBrand || "")
    .trim()
    .toLowerCase()
    .startsWith("y")
    ? "yes"
    : "no";

  return {
    sellerMatchesBrand: yn,
    brandSimple:
      typeof parsed?.brandSimple === "string" && parsed.brandSimple.trim()
        ? parsed.brandSimple.trim()
        : null,
    product:
      typeof parsed?.product === "string" && parsed.product.trim()
        ? parsed.product.trim()
        : null,
  };
}

/* ===================== HTML EXTRACT ===================== */

export async function extractFromHTML(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // bot / low-content checks
    if (html.length < 2000) return null;
    if (/captcha|robot check|automated access|verify you are human/i.test(html))
      return null;

    const $ = cheerio.load(html);
    const productJsonLd = findJsonLdProduct($);
    const offer = pickJsonLdOffer(productJsonLd?.offers);

    const rawTitle =
      getJsonLdString(productJsonLd?.name) ||
      $('meta[property="og:title"]').attr("content") ||
      $("#productTitle").text()?.trim() ||
      $("title").first().text()?.trim() ||
      null;

    if (!rawTitle) return null;

    // PRICE: gather multiple sources, then normalize to numeric + display.
    const offerPrice = offer?.price ?? offer?.priceSpecification?.price;
    const metaPrice = $('meta[property="product:price:amount"]').attr("content");
    const domPrice = $(".a-price .a-offscreen").first().text();

    const rawPrice = offerPrice ?? metaPrice ?? domPrice ?? null;
    const priceValue = parsePriceToNumber(rawPrice);
    const price = priceValue !== null ? formatPriceDisplay(priceValue, "$") : null;

    // SELLER: add additional fallbacks (Amazon and generic templates)
    let seller =
      getJsonLdString(offer?.seller) ||
      $('[data-testid="seller-name"]').text() ||
      $('a[id*="sellerProfileTriggerId"]').text() ||
      $("#sellerProfileTriggerId").text() ||
      $("#merchant-info").text() ||
      $('[data-feature-name="merchant-info"]').text() ||
      $("#bylineInfo").text() ||
      $('a#bylineInfo').text() ||
      $('meta[name="author"]').attr("content") ||
      null;

    seller = normalizeSeller(seller);

    let brand =
      getJsonLdString(productJsonLd?.brand) || $('[itemprop="brand"]').text() || null;

    brand = normalizeBrand(brand);

    const domain = normalizeDomain(u.hostname);

    // AI step happens HERE
    const ai = await aiMatchAndSimplify({
      rawTitle,
      brand,
      seller,
      domain,
    });

    return {
      seller,
      price, // stable display (e.g., "$129.99")
      priceValue, // stable numeric compare (e.g., 129.99)
      domain,
      platform: domain, // alias
      sellerMatchesBrand: ai?.sellerMatchesBrand || "no",
      brandSimple: ai?.brandSimple || null,
      product: ai?.product || null,
      source: "html",
    };
  } catch {
    return null;
  }
}
