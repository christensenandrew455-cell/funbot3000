export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  return await res.text();
}

function extractTextBlocks(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const title = document.title || "";

  const rawTexts = Array.from(document.querySelectorAll("main p, article p, section p"))
    .map(el => el.textContent?.trim())
    .filter(t => t && t.length > 60 && !/[\{\}<>\[\]=]/.test(t));

  const MAX_CHARS = 500;
  const MAX_BLOCKS = 50;

  const textBlocks = rawTexts.slice(0, MAX_BLOCKS).map(t => t.slice(0, MAX_CHARS));
  return { textBlocks, title };
}

async function analyzeSegments(segments) {
  const results = [];

  for (const segment of segments) {
    const prompt = `Analyze this content for credibility and risk:\n\n${segment.join("\n---\n")}\n\nRespond ONLY in JSON:\n{ "status": "good" | "bad", "review": "string", "alternative": "string" }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    try {
      results.push(JSON.parse(completion.choices[0].message.content));
    } catch {
      results.push({ status: "bad", review: completion.choices[0].message.content, alternative: "" });
    }
  }

  return results;
}

async function mergeResults(segmentResults) {
  const mergePrompt = `Combine these analyses into ONE final JSON:\n${segmentResults
    .map((r, i) => `Segment ${i + 1}: ${JSON.stringify(r)}`)
    .join("\n")}\nRespond ONLY in JSON:\n{ "status": "good" | "bad", "review": "string", "alternative": "string" }`;

  const finalCompletion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: mergePrompt }],
  });

  try {
    return JSON.parse(finalCompletion.choices[0].message.content);
  } catch {
    return { status: "bad", review: finalCompletion.choices[0].message.content, alternative: "" };
  }
}

export async function POST(req) {
  try {
    let { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isValidUrl(url)) return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });

    let html;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }

    const { textBlocks, title } = extractTextBlocks(html);
    if (!textBlocks.length) return new Response(JSON.stringify({ error: "No readable content found" }), { status: 400 });

    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url) ? "product" : "website";

    const segments = chunkArray(textBlocks, 5);
    const segmentResults = await analyzeSegments(segments);

    const finalResult = await mergeResults(segmentResults);

    return new Response(JSON.stringify({ aiResult: { ...finalResult, type, title } }), { status: 200 });

  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
