import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  let type = "website";
  if (/amazon\.com|shopify|walmart\.com|bestbuy\.com/i.test(url)) type = "product";

  // Fetch content
  let content;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();

    if (type === "product") {
      // Simplest parsing: get title + description (could improve with site-specific logic)
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
      content = {
        title: titleMatch ? titleMatch[1] : "",
        description: descMatch ? descMatch[1] : "",
        url,
      };
    } else {
      // Generic website summary
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      content = { title: titleMatch ? titleMatch[1] : "", url };
    }
  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch URL" });
  }

  // AI review
  try {
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

    const aiResponse = completion.choices[0].message.content;
    let json;
    try {
      json = JSON.parse(aiResponse);
    } catch {
      // fallback: treat entire response as review
      json = { status: "bad", review: aiResponse, alternative: "" };
    }

    return res.status(200).json({ aiResult: json });
  } catch (err) {
    console.error("AI error:", err);
    return res.status(500).json({ error: "AI review failed" });
  }
}
