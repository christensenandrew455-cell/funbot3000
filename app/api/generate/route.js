export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isValidUrl(url) {
  try { return ["http:", "https:"].includes(new URL(url).protocol); }
  catch { return false; }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function POST(req) {
  try {
    let { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isValidUrl(url)) return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });

    let html;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
      if (!res.ok) return new Response(JSON.stringify({ error: `Failed to fetch: ${res.status}` }), { status: 400 });
      html = await res.text();
    } catch {
      return new Response(JSON.stringify({ error: "Unable to fetch page" }), { status: 400 });
    }

    // Parse HTML without running scripts
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const title = document.title || "";

    const MAX_BLOCKS = 50, MAX_CHARS = 500;
    const textBlocks = Array.from(document.querySelectorAll("main p, article p, section p"))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 60 && !/[\{\}<>\[\]=]/.test(t))
      .map(t => t.slice(0, MAX_CHARS))
      .slice(0, MAX_BLOCKS);

    if (!textBlocks.length) return new Response(JSON.stringify({ error: "No readable content found" }), { status: 400 });

    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url) ? "product" : "website";

    const segments = chunkArray(textBlocks, 5);
    const segmentResults = [];
    for (const segment of segments) {
      const prompt = `Analyze this content for credibility and risk:\n\n${segment.join("\n---\n")}\n\nRespond ONLY in JSON:\n{ "status": "good" | "bad", "review": "string", "alternative": "string" }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });

      try {
        segmentResults.push(JSON.parse(completion.choices[0].message.content));
      } catch {
        segmentResults.push({ status: "bad", review: completion.choices[0].message.content, alternative: "" });
      }
    }

    const mergePrompt = `Combine these analyses into ONE final JSON:\n${segmentResults.map((r, i) => `Segment ${i + 1}: ${JSON.stringify(r)}`).join("\n")}\nRespond ONLY in JSON:\n{ "status": "good" | "bad", "review": "string", "alternative": "string" }`;

    const finalCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: mergePrompt }],
    });

    let finalResult;
    try {
      finalResult = JSON.parse(finalCompletion.choices[0].message.content);
    } catch {
      finalResult = { status: "bad", review: finalCompletion.choices[0].message.content, alternative: "" };
    }

    return new Response(JSON.stringify({ aiResult: { ...finalResult, type, title } }), { status: 200 });

  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
