import fetch from "node-fetch";
import * as cheerio from "cheerio";

/* ===================== NORMALIZATION ===================== */

export function normalizeBrand(raw) {
  if (!raw) return null;

  return raw
    .replace(/^(brand[:\s]+|visit the\s+|by\s+)/i, "")
    .replace(/\s+store$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function collectJsonLdNodes(value, nodes) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(item => collectJsonLdNodes(item, nodes));
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
      const parsed = JSON.parse(text);
      collectJsonLdNodes(parsed, nodes);
    } catch {
      return;
    }
  });

  return nodes.find(node => {
    const type = node?.["@type"];
    if (!type) return false;
    if (Array.isArray(type)) return type.includes("Product");
    return type === "Product";
  });
}

function getJsonLdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.name === "string") return value.name;
  return null;
}

export function simplifyTitle(title) {
  if (!title) return null;

  return title
    .toLowerCase()
    .replace(/amazon\.com|sports & outdoors/gi, "")
    .replace(/\|.*$/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d+[-\w]*\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ===================== HTML EXTRACT ===================== */
/* NOTE:
   This extractor intentionally DOES NOT parse:
   - product descriptions
   - feature bullets
   - marketing text
   - seller claims
   Only factual page metadata is extracted.
*/

export async function extractFromHTML(url) {
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
    const productJsonLd = findJsonLdProduct($);
    
    const title =
      getJsonLdString(productJsonLd?.name) ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      null;

        const jsonLdOffers = productJsonLd?.offers;
    const offers = Array.isArray(jsonLdOffers)
      ? jsonLdOffers
      : jsonLdOffers
      ? [jsonLdOffers]
      : [];
    const primaryOffer = offers[0] || null;

    let price =
      (primaryOffer?.price ?? primaryOffer?.priceSpecification?.price) ||
      $('meta[property="product:price:amount"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]').first().text() ||
      null;

    if (price) {
      const match = price.match(/\$?\d+(\.\d{2})?/);
      price = match ? match[0] : null;
    }

    let seller =
      getJsonLdString(primaryOffer?.seller) ||
      $("#sellerProfileTriggerId").text() ||
      $("#bylineInfo").text() ||
      null;

    if (seller) seller = seller.replace(/\s+/g, " ").trim();

    let brand =
      getJsonLdString(productJsonLd?.brand) ||
      $('[itemprop="brand"]').text() ||
      $('#productOverview_feature_div tr:contains("Brand") td').text() ||
      null;

    brand = normalizeBrand(brand);

    return {
      title,
      price,
      seller,
      brand,
      platform: new URL(url).hostname.replace("www.", ""),
      source: "html",
    };
  } catch {
    return null;
  }
}
