import { OpenAI } from "openai";
import { extractFromHTML } from "./extract";
import { gatherFacts } from "./search";

/* ===================== OPENAI ===================== */

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const openai = getClient();

/* ===================== HELPERS ===================== */

function safeJSON(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/* ===================== TITLE SIMPLIFICATION ===================== */

async function simplifyTitle(rawTitle) {
  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: `
Simplify this product title into a short, generic name.
Remove store names, promo words, and clutter.

Title:
${rawTitle}
`,
  });

  return res.output_text?.trim() || rawTitle;
}

/* ===================== FINAL DECISION ===================== */

async function decideVerdict(data) {
  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: `
Decide ONE final category and explain briefly.

Categories:
- scam: payment taken or product not delivered
- untrustworthy: arrives but common swaps, defects, or no support
- overpriced: safe to buy but far above market value
- good product: minor faults, fair price, reasonable risk

Data:
${JSON.stringify(data, null, 2)}

Return JSON only:
{
  "label": "scam | untrustworthy | overpriced | good product",
  "reason": string
}
`,
  });

  return safeJSON(res.output_text);
}

/* ===================== ROUTE ===================== */

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const extracted = await extractFromHTML(url);
    if (!extracted) {
      return Response.json(
        { error: "Could not extract enough product information." },
        { status: 422 }
      );
    }

    const title = await simplifyTitle(extracted.rawTitle);

    const facts = await gatherFacts({
      brand: extracted.brand,
      product: title,
      seller: extracted.seller,
    });

    const verdict = await decideVerdict({
      platform: extracted.platform,
      title,
      price: extracted.price,
      seller: extracted.seller,
      brand: extracted.brand,
      facts,
    });

    if (!verdict) {
      return Response.json({ error: "AI decision failed." }, { status: 500 });
    }

    return Response.json({
      aiResult: {
        status: verdict.label,
        title,
        reason: verdict.reason,
      },
      extracted,
    });
  } catch {
    return Response.json({ error: "Request failed." }, { status: 500 });
  }
}
