import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Received body:", data);

    // Build prompt parts for optional info
    const promptParts = [];
    if (data.season) promptParts.push(`Season: ${data.season}`);
    if (data.personality) promptParts.push(`Personality: ${data.personality}`);
    if (data.people) promptParts.push(`People: ${data.people}`);
    if (data.location) promptParts.push(`Location: ${data.location}`);
    if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
    if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

    let userPrompt;
    if (promptParts.length > 0) {
      userPrompt = `Generate a fun activity based on the following optional info: ${promptParts.join(
        ", "
      )}. Include a 1–2 sentence quick description and a detailed paragraph.`;
    } else {
      userPrompt =
        "Generate a random fun activity for anyone. No input information is required. Include a 1–2 sentence quick description and a detailed paragraph.";
    }

    console.log("Using prompt:", userPrompt);

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are FunBot 3000, a fun activity generator. All user input is optional. If no input is provided, generate a fun activity for anyone."
        },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 400,
    });

    console.log("Raw GPT response:", completion);

    // Extract text reliably
    let text = "";
    try {
      const msg = completion.choices?.[0]?.message;
      if (msg) {
        if (Array.isArray(msg.content)) {
          text = msg.content.map(c => c.text).join("\n").trim();
        } else if (msg.content?.text) {
          text = msg.content.text.trim();
        } else if (typeof msg.content === "string") {
          text = msg.content.trim();
        }
      }
    } catch (err) {
      console.warn("Failed to parse GPT content:", err);
    }

    if (!text) {
      text = "Oops! GPT did not return a result. Try changing your inputs slightly.";
    }

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        result:
          "Error occurred while generating activity. Please check server logs.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
