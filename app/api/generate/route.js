export const runtime = "nodejs";

import { OpenAI } from "openai";
import whois from "whois-json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getDomain(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

async function getDomainAge(domain) {
  try {
    const data = await whois(domain);
    const created =
      data.creationDate || data.createdDate || data.registered;
    if (!created) return null;
    return Math.floor(
      (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24)
    );
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    const domain = getDomain(url);
    const domainAgeDays = await getDomainAge(domain);

    // Basic heuristics (expand later)
    let websiteTrustScore = 50;
    const flags = [];

    if (domainAgeDays !== null) {
      if (domainAgeDays < 180) {
        websiteTrustScore -= 30;
        flags.push("Domain registered recently");
      } else if (domainAgeDays > 1825) {
        websiteTrustScore += 20;
      }
    }

    const prompt = `
You are an e-commerce risk analyst.

Given:
- Product URL: ${url}
- Domain: ${domain}
- Domain age (days): ${domainAgeDays ?? "unknown"}
- Website trust score: ${websiteTrustScore}/100
- Flags: ${flags.join(", ") || "none"}

Task:
- Assess scam likelihood conservatively
- Do NOT invent facts
- Base conclusions on provided signals
- Use probabilistic language

Respond ONLY in JSON:
{
  "status": "good" | "bad",
  "review": "string",
  "sellerTrust": "high" | "medium" | "low",
  "confidence": "high" | "medium" | "low",
  "alternative": "string"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

    return new Response(
      JSON.stringify({
        aiResult: {
          ...aiResult,
          websiteTrustScore,
          domain,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
