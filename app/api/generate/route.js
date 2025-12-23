export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isValidUrl(url) {
  try {
    const p = new URL(url).protocol;
    return p === "http:" || p === "https:";
  } catch {
    return false;
  }
}

function extractTextBlocks(document) {
  const MAX_BLOCKS = 40;
  const MAX_CHARS = 400;
  const nodeList = document.querySelectorAll("main p, article p, section p, h1, h2, h3");

  const blocks = [];
  for (const el of nodeList) {
    if (!el || !el.textContent) continue;
    let t = el.textContent.trim();
    if (t.length < 70 || /[\{\}<>\[\]=]/.test(t)) continue;
    blocks.push(t.slice(0, MAX_CHARS));
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks;
}

export async function POST(req) {
  try {
    let { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isValidUrl(url)) return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });

    let html;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch page: ${res.status}` }), { status: 400 });
      }
      html = await res.text();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Unable to fetch page: " + err.message }), { status: 400 });
    }

    html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const title = document.title || "";
    const textBlocks = extractTextBlocks(document);

    if (!textBlocks.length) {
      return new Response(JSON.stringify({ error: "No readable content found on the page" }), { status: 400 });
    }

    const prompt = `
You are a professional e-commerce fraud analyst.
Use both the page content and your own knowledge.

Task:
- Determine if the product at this URL is likely a scam.
- Evaluate the seller's reliability.
- Provide reasons for your assessment.
- If it's a scam, suggest a trustworthy alternative.
- Include a confidence level.

Product URL: ${url}
Title: ${title}
Content: ${textBlocks.join("\n---\n")}

Respond ONLY in JSON with:
{
  "status": "good" | "bad",
  "review": "string",
  "alternative": "string",
  "sellerTrust": "high" | "medium" | "low",
  "confidence": "high" | "medium" | "low"
}
    `.trim();

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
        review: completion.choices[0].message.content.slice(0, 2000),
        alternative: "",
        sellerTrust: "low",
        confidence: "medium",
      };
    }

    return new Response(JSON.stringify({ aiResult: { ...aiResult, title } }), { status: 200 });
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
}
