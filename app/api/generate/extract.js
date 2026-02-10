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
  if (Array.isArray(value)) return value.forEach(v => collectJsonLdNodes(v, nodes));
  if (typeof value === "object") {
    nodes.push(value);
    if (value["@graph"]) collectJsonLdNodes(value["@graph"], nodes);
  }
}

function findJsonLdProduct($) {
  const nodes = [];
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      collectJsonLdNodes(JSON.parse($(el).text()), nodes);
    } catch {}
  });

  return nodes.find(n =>
    Array.isArray(n?.["@type"])
      ? n["@type"].includes("Product")
      : n?.["@type"] === "Product"
  );
}

function getJsonLdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value?.name === "string") return value.name;
  return null;
}

export function simplifyTitle(title) {
  if (!title) return null;

  return title
    .toLowerCase()
    .replace(/amazon\.com/gi, "")
    .replace(/\|.*$/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d+[-\w]*\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ===================== HTML EXTRACT ===================== */

export async function extractFromHTML(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
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

    const offers = [].concat(productJsonLd?.offers || []);
    const primaryOffer = offers[0];

    let price =
      primaryOffer?.price ||
      primaryOffer?.priceSpecification?.price ||
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]').first().text() ||
      null;

    if (price) {
      const m = price.match(/\$?\d+(\.\d{2})?/);
      price = m ? m[0] : null;
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
