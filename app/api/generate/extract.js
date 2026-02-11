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

  if (!normalized || ["null", "undefined", "n/a", "na", "none", "unknown"].includes(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeEntity(value) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/^(null|undefined|n\/?a|none|unknown)$/i.test(normalized)) return null;
  return normalized;
}

/* ===================== JSON-LD HELPERS ===================== */

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

  return nodes.find(n => Array.isArray(n?.["@type"])
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

/* ===================== HTML EXTRACT ===================== */

export async function extractFromHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Chrome/121",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    if (html.length < 5000 || /captcha|robot check|automated access/i.test(html)) {
      return null;
    }

    const $ = cheerio.load(html);
    const productJsonLd = findJsonLdProduct($);

    const rawTitle =
      getJsonLdString(productJsonLd?.name) ||
      $('meta[property="og:title"]').attr("content") ||
      $("#productTitle").text()?.trim() ||
      $("title").first().text() ||
      null;

    if (!rawTitle) return null;

    let price =
      productJsonLd?.offers?.price ||
      $(".a-price .a-offscreen").first().text() ||
      null;

    if (price) {
      const m = price.match(/\$?\d+(\.\d{2})?/);
      price = m ? m[0] : null;
    }

    let seller =
      getJsonLdString(productJsonLd?.offers?.seller) ||
      $("#sellerProfileTriggerId").text() ||
      $("#merchant-info").text() ||
      null;

    let brand =
      getJsonLdString(productJsonLd?.brand) ||
      $('[itemprop="brand"]').text() ||
      null;

    return {
      rawTitle,
      price,
      seller: normalizeEntity(seller),
      brand: normalizeBrand(brand),
      platform: new URL(url).hostname.replace("www.", ""),
      source: "html",
    };
  } catch {
    return null;
  }
}
