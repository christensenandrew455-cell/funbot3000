import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Received body:", data);

    // Build prompt
    const promptParts = [];
    if (data.season) promptParts.push(`Season: ${data.season}`);
    if (data.personality) promptParts.push(`Personality: ${data.personality}`);
    if (data.people) promptParts.push(`People: ${data.people}`);
    if (data.location) promptParts.push(`Location: ${data.location}`);
    if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
    if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

    let prompt;
    if (promptParts.length > 0) {
      prompt = `Generate a fun activity based on: ${promptParts.join(
        ", "
      )}. Include a 1–2 sentence quick description and a detailed paragraph.`;
    } else {
      prompt =
        "Generate a random fun activity with a 1–2 sentence quick description and a detailed paragraph.";
    }

    console.log("Using prompt:", prompt);

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are FunBot 3000, a fun activity generator." },
        { role: "user", content: prompt }
      ],
      max_tokens: 400,
    });

    console.log("Raw GPT response:", completion);

    // Safely extract text
    const text = completion.choices?.[0]?.message?.content?.trim();

    if (!text) {
      console.warn("GPT returned empty content, using fallback text.");
      return NextResponse.json({
        result: "Oops! GPT did not return a result. Try changing your inputs slightly.",
      });
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
