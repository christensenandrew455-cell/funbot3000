export const runtime = "nodejs";

import { OpenAI } from "openai";
import puppeteer from "puppeteer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const extracted = await page.evaluate(() => {
      const title = document.title || "";

      const textBlocks = Array.from(
        document.querySelectorAll("p, li, article, section, div")
      )
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 60)
        .slice(0, 120);

      return { title, textBlocks };
    });

    await browser.close();

    const textCount = extracted.textBlocks.length;
    const duplicateCount =
      textCount -
      new Set(extracted.textBlocks.map(t => t.toLowerCase())).size;

    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url)
      ? "product"
      : "website";

    const prompt = `
You are a professional fraud and credibility analyst.

Type: ${type}
URL: ${url}
Title: ${extracted.title}
Text blocks: ${textCount}
Duplicate blocks: ${duplicateCount}

CONTENT:
${extracted.textBlocks.join("\n---\n")}

RULES:
- Penalize low content
- Penalize repeated or templated language
- Detect fake or AI-written reviews
- Consider seller/site credibility
- Output ONLY valid JSON

FORMAT:
{
  "status": "good" | "bad",
  "review": "string",
  "alternative": "string"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let aiResult;
    try {
      aiResult = JSON.parse(completion.choices[0].message.content);
    } catch {
      aiResult = {
        status: "bad",
        review: completion.choices[0].message.content,
        alternative: "",
      };
    }

    return new Response(
      JSON.stringify({
        aiResult: {
          ...aiResult,
          type,
          title: extracted.title,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
