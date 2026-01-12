// lib/server/screenshot.js
import playwright from "playwright-chromium";

export async function screenshotPage(url) {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    const screenshot = await page.screenshot({ fullPage: true, type: "png" });
    return screenshot.toString("base64");
  } finally {
    await browser.close();
  }
}
