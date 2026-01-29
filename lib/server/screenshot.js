export async function screenshotPage(url, options = {}) {
  const API_KEY = process.env.APIFLASH_KEY;
  if (!API_KEY) throw new Error("ApiFlash key missing");

  let hideSelectors = options.hideSelectors || "";
  hideSelectors = hideSelectors
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .join(",");

  const screenshotUrl =
    `https://api.apiflash.com/v1/urltoimage` +
    `?access_key=${API_KEY}` +
    `&url=${encodeURIComponent(url)}` +
    `&full_page=true` +
    `&wait_until=page_loaded` +
    (hideSelectors ? `&hide_selectors=${encodeURIComponent(hideSelectors)}` : "") +
    `&format=png`;

  const res = await fetch(screenshotUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ApiFlash error ${res.status}: ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
