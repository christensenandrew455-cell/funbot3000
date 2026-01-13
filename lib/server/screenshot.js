import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function screenshotPage(url) {
  const executablePath =
    process.env.NODE_ENV === "development"
      ? undefined
      : await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    const buffer = await page.screenshot({ fullPage: true });
    return buffer.toString("base64");
  } finally {
    await page.close();
    await browser.close();
  }
}
