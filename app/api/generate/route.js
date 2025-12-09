// app/api/generate/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("API /generate received:", data);

    // Prepare optional prompt parts
    const promptParts = [];
    if (data.season) promptParts.push(`Season: ${data.season}`);
    if (data.personality) promptParts.push(`Personality: ${data.personality}`);
    if (data.people) promptParts.push(`People: ${data.people}`);
    if (data.location) promptParts.push(`Location: ${data.location}`);
    if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
    if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

    const userPrompt = promptParts.length
      ? `Generate a fun activity based on the following OPTIONAL inputs: ${promptParts.join(", ")}. Include a 1–2 sentence quick description and then a detailed paragraph on how to do it.`
      : "Generate a random fun activity for anyone. Include a 1–2 sentence quick description and then a detailed paragraph on how to do it. Inputs are optional.";

    console.log("Prompt sent to OpenAI:", userPrompt);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are FunBot 3000, a friendly activity suggestion assistant. Treat all user inputs as OPTIONAL. If none are provided, create a broadly-appealing activity." },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
    });

    console.log("Raw OpenAI completion:", completion);

    // Robust extraction of the assistant content
    let text = "";
    const msg = completion?.choices?.[0]?.message;
    if (msg) {
      // msg.content can be array or object or string depending on SDK
      if (Array.isArray(msg.content)) {
        // array of blocks: { type: "...", text: "..." } or { text: "..." }
        text = msg.content.map((c) => c?.text ?? c?.content ?? "").join("\n").trim();
      } else if (typeof msg.content === "object") {
        // object with .text or other
        text = (msg.content.text ?? msg.content?.[0]?.text ?? "").trim();
      } else if (typeof msg.content === "string") {
        text = msg.content.trim();
      }
    }

    if (!text) {
      console.warn("OpenAI returned no text; using fallback.");
      text = "Oops — the AI didn't return a proper suggestion. Try again or tweak your inputs.";
    }

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error("API generate error:", err);
    return NextResponse.json({ error: err.message, result: "Error generating activity. Check server logs." }, { status: 500 });
  }
}
