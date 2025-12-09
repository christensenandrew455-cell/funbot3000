import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("API/GNERATE DATA:", data);

    const promptParts = [];
    if (data.season) promptParts.push(`Season: ${data.season}`);
    if (data.personality) promptParts.push(`Personality: ${data.personality}`);
    if (data.people) promptParts.push(`People: ${data.people}`);
    if (data.location) promptParts.push(`Location: ${data.location}`);
    if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
    if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

    const userPrompt = promptParts.length
      ? `Generate a fun activity based on the following OPTIONAL inputs: ${promptParts.join(", ")}. Include a 1–2 sentence quick description and a detailed paragraph.`
      : `Generate a random fun activity. Inputs are optional. Include a 1–2 sentence short description and a detailed paragraph.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are FunBot 3000. All inputs are optional. If none are provided, generate a general fun activity.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 500,
    });

    console.log("RAW GPT COMPLETION:", completion);

    // -------------------------
    // CORRECT TEXT EXTRACTION
    // -------------------------
    let text = "";

    try {
      const msg = completion?.choices?.[0]?.message;

      if (msg?.content) {
        if (Array.isArray(msg.content)) {
          text = msg.content
            .map((block) => {
              if (typeof block === "string") return block;
              if (block?.text) return block.text;
              if (block?.content) return block.content;
              return "";
            })
            .join("\n")
            .trim();
        } else if (typeof msg.content === "string") {
          text = msg.content.trim();
        }
      }
    } catch (err) {
      console.error("EXTRACTION ERROR:", err);
    }

    if (!text || text.trim() === "") {
      console.error("❌ GPT returned no text. RAW:", completion);
      text = "AI returned an empty response. Try again.";
    }

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: err.message, result: "API failure." },
      { status: 500 }
    );
  }
}
