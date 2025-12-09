import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      personality,
      locationPref,
      season,
      minAge,
      maxAge,
      numPeople,
      extraInfo,
    } = body || {};

    const constraints = [];
    if (personality) constraints.push(`personality: ${personality}`);
    if (locationPref) constraints.push(`inside/outside: ${locationPref}`);
    if (season) constraints.push(`season: ${season}`);
    if (minAge) constraints.push(`minAge: ${minAge}`);
    if (maxAge) constraints.push(`maxAge: ${maxAge}`);
    if (numPeople) constraints.push(`numPeople: ${numPeople}`);
    if (extraInfo) constraints.push(`extra: ${extraInfo}`);

    const constraintText =
      constraints.length > 0
        ? `Constraints: ${constraints.join(", ")}.`
        : "No constraints provided.";

    const userPrompt = `
You are Fun Bot 3000. Suggest ONE engaging activity.

Return ONLY strict JSON:
{
  "title": "<3-6 word title>",
  "short": "<10-20 word summary>",
  "long": "<2-4 sentences>"
}

User info:
${constraintText}

No markdown. JSON only.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 400,
      temperature: 0.9,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    let aiResult = { title: "", short: "", long: "", raw: text };

    try {
      const jsonStart = text.indexOf("{");
      const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
      aiResult = { ...aiResult, ...(JSON.parse(jsonText) || {}) };
    } catch (err) {
      aiResult.long = text.trim();
      aiResult.short = aiResult.long.split(".")[0] || "";
    }

    return new Response(
      JSON.stringify({ success: true, aiResult, userData: body }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        aiResult: { title: "", short: "", long: "" },
        error: err?.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
