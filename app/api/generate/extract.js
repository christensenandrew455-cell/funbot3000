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
