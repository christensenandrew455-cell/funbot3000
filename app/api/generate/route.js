export const runtime = "nodejs";

import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// basic URL sanity check
function isValidUrl(url) {
  try {
    const p = new URL(url).protocol;
    return p === "http:" || p === "https:";
  } catch {
    return false;
  }
}

// pull readable text from page, limited size
function extractTextBlocks(document) {
  const MAX_BLOCKS = 40;   // keep this small to avoid huge token usage
  const MAX_CHARS = 400;   // trim each block to avoid overload

  // select common content containers only
  const nodeList = document.querySelectorAll(
    "main p, article p, section p, h1, h2, h3"
  );

  const blocks = [];
  for (const el of nodeList) {
    if (!el || !el.textContent) continue;
    let t = el.textContent.trim();

    // skip too short or code-like strings
    if (t.length < 70) continue;
    if (/[\{\}<>\[\]=]/.test(t)) continue;

    // shorten and store
    t = t.slice(0, MAX_CHARS);
    blocks.push(t);
    if (blocks.length >= MAX_BLOCKS) break;
  }

  return blocks;
}

export async function POST(req) {
  try {
    let { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL" }),
        { status: 400 }
      );
    }

    // prepend protocol if missing, like Google search bar behavior
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400 }
      );
    }

    // fetch HTML
    let html;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch: ${res.status}` }),
          { status: 400 }
        );
      }
      html = await res.text();
    } catch {
      return new Response(
        JSON.stringify({ error: "Unable to fetch page" }),
        { status: 400 }
      );
    }

    // Strip <script> and <style> blocks to avoid parser errors and noise
    // This is a simple, quick cleanup before parsing
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

    // parse
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const title = document.title || "";

    // extract short text blocks
    const textBlocks = extractTextBlocks(document);
    if (!textBlocks.length) {
      return new Response(
        JSON.stringify({ error: "No readable content found" }),
        { status: 400 }
      );
    }

    // classify URL type (simple heuristic)
    const type = /amazon|walmart|bestbuy|shopify|product/i.test(url)
      ? "product"
      : "website";

    // Build prompt for AI
    const prompt = `
You are a professional fraud and credibility analyst.
Use both the extracted page text and your own knowledge about the site or product.

Type: ${type}
URL: ${url}
Title: ${title}

CONTENT:
${textBlocks.join("\n---\n")}

Respond ONLY in JSON exactly in this format:
{ "status": "good" | "bad", "review": "string", "alternative": "string" }
`.trim();

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content;
    let aiResult;
    try {
      aiResult = JSON.parse(raw);
    } catch {
      // fallback if parsing fails
      aiResult = {
        status: "bad",
        review: raw.slice(0, 2000),  // cut very long text
        alternative: "",
      };
    }

    // return structured result
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
