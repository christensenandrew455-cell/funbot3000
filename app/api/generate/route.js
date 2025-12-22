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

function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(req) {
  try {
    let { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    // Normalize URL
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isValidUrl(url)) return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });

    // Fetch page content
    let html;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120" },
        redirect: "follow",
      });
      if (!res.ok) return new Response(JSON.stringify({ error: `Failed to fetch page: ${res.status}` }), { status: 400 });
      html = await res.text();
    } catch {
      return new Response(JSON.stringify({ error: "Unable to fetch page" }), { status: 400 });
    }

    // Parse HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const title = document.title || "";

    // Extract text blocks and truncate to prevent token overload
    const MAX_BLOCKS = 50;
    const MAX_CHARS_PER_BLOCK = 500;
    const textBlocks = Array.from(document.querySelectorAll("main p, article p, section p, div, span"))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 60)
      .map(t => t.slice(0, MAX_CHARS_PER_BLOCK))
      .slice(0, MAX_BLOCKS);

    if (textBlocks.length === 0) {
      return new Response(JSON.stringify({ error: "No readable content found on page" }), { status: 400 });
    }

    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url) ? "product" : "website";

    // Split content into segments
    const segments = chunkArray(textBlocks, 5);
    const segmentResults = [];

    // Analyze each segment
    for (const segment of segments) {
      const segmentPrompt = `
You are a professional fraud and credibility analyst.
Analyze this content segment for credibility and risk:

${segment.join("\n---\n")}

Combine it with your own knowledge about the site/product.
Respond ONLY in JSON with format:
{ "status": "good" | "bad", "review": "string", "alternative": "string" }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: segmentPrompt }],
      });

      const output = completion.choices[0].message.content;
      let result;
      try { result = JSON.parse(output); } 
      catch { result = { status: "bad", review: output, alternative: "" }; }
      segmentResults.push(result);
    }

    // Merge segment results
    const mergePrompt = `
You are given multiple analyses of different segments of a page:

${segmentResults.map((r, i) => `Segment ${i+1}: ${JSON.stringify(r)}`).join("\n\n")}

Combine them into ONE final analysis. Respond ONLY in JSON with format:
{ "status": "good" | "bad", "review": "string", "alternative": "string" }
    `;

    const finalCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: mergePrompt }],
    });

    let finalResult;
    try { finalResult = JSON.parse(finalCompletion.choices[0].message.content); }
    catch { finalResult = { status: "bad", review: finalCompletion.choices[0].message.content, alternative: "" }; }

    return new Response(JSON.stringify({
      aiResult: {
        ...finalResult,
        type,
        title,
      },
    }), { status: 200 });

  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
