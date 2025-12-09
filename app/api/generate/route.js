import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const data = await req.json();

    const promptParts = [];
    if (data.season) promptParts.push(`Season: ${data.season}`);
    if (data.personality) promptParts.push(`Personality: ${data.personality}`);
    if (data.people) promptParts.push(`People: ${data.people}`);
    if (data.location) promptParts.push(`Location: ${data.location}`);
    if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
    if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

    const prompt = promptParts.length
      ? `Generate a fun activity based on: ${promptParts.join(", ")}. Include a 1–2 sentence quick description and a detailed paragraph.`
      : `Generate a random fun activity for anyone. Include a 1–2 sentence quick description and a detailed paragraph.`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 400,
    });

    const text = response.output_text;

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
