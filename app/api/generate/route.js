import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();

    const userName = body.name || "someone";
    const userHobby = body.hobby || "something fun";

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "user", content: `Make a funny sentence about ${userName} and ${userHobby}.` }
      ],
    });

    const aiResult = completion.choices[0]?.message?.content || "";

    return new Response(JSON.stringify({
      success: true,
      aiResult,
      userData: body
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      success: false,
      aiResult: "",
      error: err.message
    }), { status: 500 });
  }
}
