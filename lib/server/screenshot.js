const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY;

export async function screenshotPage(url) {
  if (!SCREENSHOT_API_KEY) {
    throw new Error("ScreenshotAPI key missing");
  }

  // Optional JS to remove Amazon "Shop from" popup
  const hidePopupsJS = `
    const popup = document.querySelector("#glow-ingress-block, .nav-sprite.glow-ingress-line");
    if (popup) popup.remove();
  `;

  const payload = {
    url,
    output: "base64",          // return base64 image
    device: "desktop",
    full_page: true,
    wait_until: "domcontentloaded",
    js: hidePopupsJS,
  };

  const res = await fetch(
    `https://shot.screenshotapi.net/screenshot?token=${SCREENSHOT_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ScreenshotAPI error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.screenshot; // base64 string
}
