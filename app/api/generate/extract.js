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
    ["null", "undefined", "n/a", "na", "none", "unknown"].includes(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

function normalizeEntity(value) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  if (/^(null|undefined|n\/?a|none|unknown)$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

/* ===================== JSON-LD HELPERS ===================== */

function collectJsonLdNodes(value, nodes) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(v => collectJsonLdNodes(v, nodes));
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
  if (typeof value?.name === "string") return value.name;
  return null;
}

/* ===================== TITLE CLEAN ===================== */

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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // HARD BLOCK DETECTION (Amazon captcha / soft block)
    if (
      html.length < 5000 ||
      /captcha|robot check|automated access/i.test(html)
    ) {
      return null;
    }

    const $ = cheerio.load(html);
    const productJsonLd = findJsonLdProduct($);

    /* ===== TITLE ===== */

    const jsonTitle =
      getJsonLdString(productJsonLd?.name) ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      null;

    const amazonTitle = $("#productTitle").text()?.trim() || null;

    const finalTitle = jsonTitle || amazonTitle;
    if (!finalTitle) return null;

    /* ===== OFFERS / PRICE ===== */

    const jsonOffers = productJsonLd?.offers;
    const offers = Array.isArray(jsonOffers)
      ? jsonOffers
      : jsonOffers
      ? [jsonOffers]
      : [];

    const primaryOffer = offers[0] || null;

    let price =
      primaryOffer?.price ||
      primaryOffer?.priceSpecification?.price ||
      $('meta[property="product:price:amount"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      null;

    const amazonPrice =
      $(".a-price .a-offscreen").first().text() || null;

    price = price || amazonPrice;

    if (price) {
      const match = price.match(/\$?\d+(\.\d{2})?/);
      price = match ? match[0] : null;
    }

    /* ===== SELLER ===== */

    let seller =
      getJsonLdString(primaryOffer?.seller) ||
      $("#sellerProfileTriggerId").text() ||
      $("#bylineInfo").text() ||
      null;

    const amazonSeller =
      $("#merchant-info").text()?.trim() || null;

   seller = normalizeEntity(seller || amazonSeller);

    /* ===== BRAND ===== */

    let brand =
      getJsonLdString(productJsonLd?.brand) ||
      $('[itemprop="brand"]').text() ||
      $('#productOverview_feature_div tr:contains("Brand") td').text() ||
      null;

    brand = normalizeBrand(brand);

    /* ===== FINAL OBJECT ===== */

    return {
      title: finalTitle,
      price,
      seller,
      brand,
      platform: new URL(url).hostname.replace("www.", ""),
      source: "html",
    };
  } catch (err) {
    console.error("extractFromHTML error:", err);
    return null;
  }
}
