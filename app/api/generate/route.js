export const runtime = "nodejs";

import { OpenAI } from "openai";
import playwright from "playwright-chromium";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function screenshotPage(url) {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Scroll a few times to load lazy content
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

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    const screenshotBase64 = await screenshotPage(url);

    // GPT prompt
    const prompt = `
You are a product trust investigator.

From this screenshot:
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
    return new Response(JSON.stringify({ aiResult: evaluation }), { status: 200 });
  } catch (err) {
    console.error("API ERROR:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
