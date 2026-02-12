import fetch from "node-fetch";
import * as cheerio from "cheerio";

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

/* Keep seller short/clean (especially Amazon blobs) */
function normalizeSeller(raw) {
  const v = normalizeEntity(raw);
  if (!v) return null;

  // Common Amazon patterns:
  // "Ships from Amazon.com Sold by Apple Store"
  // "Sold by Apple Store and Fulfilled by Amazon."
  let s = v;

  // Prefer the "Sold by X" chunk if present
  const soldBy = s.match(/sold by\s+([^.\n\r|]+)\b/i);
  if (soldBy?.[1]) s = soldBy[1];

  // Remove fulfillment / shipping boilerplate
  s = s
    .replace(/ships from\s+[^.\n\r|]+/gi, "")
    .replace(/fulfilled by\s+[^.\n\r|]+/gi, "")
    .replace(/returns?[^.\n\r|]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeEntity(s);
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
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  // Prefer first Product node
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

  // Pick first offer with a usable price
  for (const o of offers) {
    const p = o?.price ?? o?.priceSpecification?.price;
    if (p !== undefined && p !== null) return o;
  }
  return offers[0] || null;
}

/* ===================== HTML EXTRACT ===================== */

export async function extractFromHTML(url) {
  try {
    // Basic URL validation (prevents weird schemes)
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

    // Basic size & bot checks
    if (html.length < 2000) return null;
    if (html.length > 2_000_000) return null; // avoid huge pages
    if (/captcha|robot check|automated access|verify you are human/i.test(html))
      return null;

    const $ = cheerio.load(html);
    const productJsonLd = findJsonLdProduct($);

    const rawTitle =
      getJsonLdString(productJsonLd?.name) ||
      $('meta[property="og:title"]').attr("content") ||
      $("#productTitle").text()?.trim() ||
      $("title").first().text()?.trim() ||
      null;

    if (!rawTitle) return null;

    const offer = pickJsonLdOffer(productJsonLd?.offers);

    let price =
      offer?.price ??
      offer?.priceSpecification?.price ??
      $('meta[property="product:price:amount"]').attr("content") ||
      $(".a-price .a-offscreen").first().text() ||
      null;

    // More robust price capture (commas + optional decimals)
    if (price) {
      const m = String(price).match(/(\$)?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/);
      price = m ? m[0] : null;
    }

    let seller =
      getJsonLdString(offer?.seller) ||
      $("#merchant-info").text() ||
      $("#sellerProfileTriggerId").text() ||
      null;

    seller = normalizeSeller(seller);

    let brand =
      getJsonLdString(productJsonLd?.brand) ||
      $('[itemprop="brand"]').text() ||
      null;

    brand = normalizeBrand(brand);

    return {
      product: rawTitle, // keep as-is; your later AI step will simplify it
      rawTitle,
      price,
      seller,
      brand,
      platform: u.hostname.replace(/^www\./, ""),
      source: "html",
    };
  } catch {
    return null;
  }
}
