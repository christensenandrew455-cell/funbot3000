export async function screenshotPage(url, options = {}) {
  const API_KEY = process.env.APIFLASH_KEY;
  if (!API_KEY) throw new Error("ApiFlash key missing");

  let hideSelectors = options.hideSelectors || "";

  // Add common overlays/popups for Amazon and similar sites
  const defaultHideSelectors = [
    ".a-popover",          // popups
    ".glow-toaster",       // toast messages
    ".a-declarative",      // modal prompts
    ".nav-main",           // top nav overlays
    ".nav-flyout",
    "#sp-cc",              // cookie consent
    ".celwidget",          // Amazon ads/related
    "#attach-close_sideSheet-link" // sometimes appears
  ];

  if (hideSelectors) hideSelectors += ",";
  hideSelectors += defaultHideSelectors.join(",");

  // Clean string for URL
  hideSelectors = hideSelectors
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .join(",");

  // Inject JS to auto-dismiss location prompts, cookie banners
  const jsInjection = encodeURIComponent(`
    const locPrompt = document.querySelector('#nav-global-location-popover-link, #glow-ingress-block');
    if (locPrompt) locPrompt.click();
    const cookieBanner = document.querySelector('#sp-cc, #attach-desktop-dp-sims_session-sims-feature');
    if (cookieBanner) cookieBanner.style.display='none';
  `);

  const screenshotUrl =
    `https://api.apiflash.com/v1/urltoimage` +
    `?access_key=${API_KEY}` +
    `&url=${encodeURIComponent(url)}` +
    `&full_page=true` +
    `&wait_until=network_idle` +  // wait until network is idle for dynamic content
    (hideSelectors ? `&hide_selectors=${encodeURIComponent(hideSelectors)}` : "") +
    `&format=png` +
    `&js=${jsInjection}`;

  const res = await fetch(screenshotUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ApiFlash error ${res.status}: ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
