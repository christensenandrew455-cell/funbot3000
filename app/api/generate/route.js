export const runtime = "nodejs";

import { OpenAI } from "openai";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/* ----------------- helpers ----------------- */
function safeJSONParse(text, fallback = {}) {
  try {
    const cleaned = text
      ?.replace(/```json/gi, "")
      ?.replace(/```/g, "")
      ?.match(/\{[\s\S]*\}/)?.[0];
    return cleaned ? JSON.parse(cleaned) : fallback;
  } catch {
    return fallback;
  }
}

/* ----------------- PUPPETEER SCREENSHOT ----------------- */
async function screenshotPage(url) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  // scroll to load lazy content
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise((r) => setTimeout(r, 500));
    }
  });

  const screenshot = await page.screenshot({
    fullPage: true,
    encoding: "base64",
  });

  await browser.close();
  return screenshot;
}

/* ----------------- BRAVE SEARCH ----------------- */
async function braveSearch(query) {
  if (!query) return [];
  const res = await fetch(
    `https://api.search.brave.com/v1/web/search?q=${encodeURIComponent(query)}&size=5`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data?.results || [];
}

/* ----------------- API ----------------- */
export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
      });
    }

    /* 1. Screenshot page */
    const screenshotBase64 = await screenshotPage(url);

    /* 2. GPT analysis (SCREENSHOT ONLY) */
    const prompt = `
You are a product trust investigator.

From the screenshot:
- Identify product name, seller/brand, stars, review count
- Assess scam likelihood logically
- Be conservative, not marketing-friendly

Return JSON ONLY in this shape:

{
  "title": string | null,
  "status": "good" | "bad",

  "websiteTrust": { "score": 1-5, "reason": string },
  "sellerTrust": { "score": 1-5, "reason": string },
  "productTrust": { "score": 1-5, "reason": string },
  "overall": { "score": 1-5, "reason": string }
}
`;

    const gptResp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_base64: screenshotBase64 },
          ],
        },
      ],
      temperature: 0.1,
    });

    const evaluation = safeJSONParse(gptResp.output_text, {});

    return new Response(JSON.stringify({ aiResult: evaluation }), {
      status: 200,
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
