export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url || !isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400 }
      );
    }

    /* ---------- Fetch HTML ---------- */
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch page");
    }

    const html = await res.text();

    /* ---------- Parse HTML ---------- */
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const title = document.title || "";

    const textBlocks = Array.from(
      document.querySelectorAll("main p, article p, section p")
    )
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 80)
      .slice(0, 120);

    const textCount = textBlocks.length;
    const duplicateCount =
      textCount -
      new Set(textBlocks.map(t => t.toLowerCase())).size;

    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url)
      ? "product"
      : "website";

    /* ---------- Prompt ---------- */
    const prompt = `
You are a professional fraud and credibility analyst.

Type: ${type}
URL: ${url}
Title: ${title}
Text blocks: ${textCount}
Duplicate blocks: ${duplicateCount}

CONTENT:
${textBlocks.join("\n---\n")}

RULES:
- Penalize low content
- Penalize repeated or templated language
- Detect fake or AI-written reviews
- Consider seller/site credibility
- Output ONLY raw JSON
- NO markdown
- NO commentary

FORMAT:
{
  "status": "good" | "bad",
  "review": "string",
  "alternative": "string"
}
`;

    /* ---------- OpenAI ---------- */
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const output = response.output_text;

    let aiResult;
    try {
      aiResult = JSON.parse(output);
    } catch {
      aiResult = {
        status: "bad",
        review: output.slice(0, 1000),
        alternative: "",
      };
    }

    return new Response(
      JSON.stringify({
        aiResult: {
          ...aiResult,
          type,
          title,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    );
  }
}
