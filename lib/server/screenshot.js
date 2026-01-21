export async function screenshotPage(url) {
  const API_KEY = process.env.APIFLASH_KEY;
  if (!API_KEY) throw new Error("ApiFlash key missing");

  const screenshotUrl =
    `https://api.apiflash.com/v1/urltoimage` +
    `?access_key=${API_KEY}` +
    `&url=${encodeURIComponent(url)}` +
    `&full_page=true` +
    `&wait_until=page_loaded` +
    `&format=png`;

  const res = await fetch(screenshotUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ApiFlash error ${res.status}: ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
