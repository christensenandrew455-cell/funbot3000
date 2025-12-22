import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    let type = "website";
    if (/amazon\.com|shopify|walmart\.com|bestbuy\.com/i.test(url)) type = "product";

    let content;
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await response.text();

      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);

      content =
        type === "product"
          ? { title: titleMatch?.[1] || "", description: descMatch?.[1] || "", url }
          : { title: titleMatch?.[1] || "", url };
    } catch (err) {
      console.error("Fetch error:", err);
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), { status: 500 });
    }

    const prompt = `
You are an expert reviewer.
Type: ${type}
Content: ${JSON.stringify(content)}

Instructions:
- Rate it "good" or "bad"
- Give a short review
- If bad, suggest one alternative link
- Respond in JSON: { status: "good"|"bad", review: "...", alternative: "..." }
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    let aiResult;
    try {
      aiResult = JSON.parse(completion.choices[0].message.content);
    } catch {
      aiResult = { status: "bad", review: completion.choices[0].message.content, alternative: "" };
    }

    return new Response(JSON.stringify({ aiResult }), { status: 200 });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

