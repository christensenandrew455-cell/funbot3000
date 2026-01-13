// lib/server/screenshot.js
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

let cachedBrowser = null;

export async function screenshotPage(url) {
  if (!cachedBrowser) {
    cachedBrowser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
  }

  const page = await cachedBrowser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000
    });

    // Scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise(r => setTimeout(r, 300));
      }
    });

    const buffer = await page.screenshot({
      fullPage: true,
      type: "png"
    });

    return buffer.toString("base64");
  } finally {
    await page.close();
  }
}
