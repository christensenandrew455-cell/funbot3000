// app/api/generate/route.js
import { OpenAI } from "openai";
import puppeteer from "puppeteer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Extract page title
    const title = await page.title();

    // Try to extract reviews generically
    const reviews = await page.evaluate(() => {
      const blocks = [];
      // Look for common review patterns
      const reviewElements = Array.from(document.querySelectorAll(
        '[class*="review"], [id*="review"], [data-test*="review"]'
      ));
      for (let el of reviewElements.slice(0, 50)) { // limit to first 50
        const text = el.innerText.trim();
        if (text) blocks.push(text);
      }
      return blocks;
    });

    // Compute simple heuristics
    const reviewCount = reviews.length;
    const avgLength = reviews.reduce((a, r) => a + r.length, 0) / (reviewCount || 1);
    const duplicateRatio =
      reviews.length > 0
        ? reviews.length - new Set(reviews.map(r => r.toLowerCase())).size
        : 0;

    await browser.close();

    // Prepare data for AI
    const content = {
      title,
      url,
      reviews,
      reviewCount,
      avgLength,
      duplicateRatio,
    };

    // Determine type (product vs website)
    const type = /amazon\.com|shopify|walmart\.com|bestbuy\.com/i.test(url)
      ? "product"
      : "website";

    // AI review prompt
    const prompt = `
You are an expert reviewer.
Type: ${type}
Content: ${JSON.stringify(content)}

Instructions:
- Rate the product or site as "good" or "bad"
- Detect if reviews are suspicious or AI-generated
- Factor in review count, duplicates, and overall credibility
- If bad, suggest an alternative link
- Respond strictly in JSON: 
{ "status": "good"|"bad", "review": "...", "alternative": "..." }
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

    return new Response(JSON.stringify({ aiResult, type }), { status: 200 });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
