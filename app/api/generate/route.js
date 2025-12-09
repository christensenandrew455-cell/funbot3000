import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();

    // Build a friendly prompt that uses any provided data; all fields optional
    const {
      name,
      hobby,
      personality,
      locationPref,
      season,
      minAge,
      maxAge,
      numPeople,
      place,
      country,
      state,
      city,
      extraInfo,
    } = body || {};

    // Compose a short description of constraints
    const constraints = [];
    if (personality) constraints.push(`personality: ${personality}`);
    if (locationPref) constraints.push(`inside/outside: ${locationPref}`);
    if (season) constraints.push(`season: ${season}`);
    if (minAge) constraints.push(`minAge: ${minAge}`);
    if (maxAge) constraints.push(`maxAge: ${maxAge}`);
    if (numPeople) constraints.push(`numPeople: ${numPeople}`);
    if (place) constraints.push(`place: ${place}`);
    if (country) constraints.push(`country: ${country}`);
    if (state) constraints.push(`state: ${state}`);
    if (city) constraints.push(`city: ${city}`);
    if (extraInfo) constraints.push(`extra: ${extraInfo}`);

    const constraintText = constraints.length ? `Constraints: ${constraints.join(", ")}.` : "No constraints provided.";

    // Ask the model to return strict JSON with 3 fields.
    const userPrompt = `
You are a playful assistant called Fun Bot 3000 whose job is to suggest one single, highly engaging activity.
Use the provided optional data to tailor the suggestion. Keep things concise.

Respond with valid JSON ONLY (no surrounding text). The JSON object must have exactly these keys:
{
  "title": "<short activity title, 3-6 words>",
  "short": "<one-sentence description or instruction, 10-20 words>",
  "long": "<longer description or step-by-step / reasons why it's fun, 2-4 sentences>"
}

Do not include any markdown or commentary — only the JSON object. If no constraints were provided, still generate a fun random activity.

User/provided info:
name: ${name || ""}
hobby: ${hobby || ""}
${constraintText}

Make sure JSON is parseable by JSON.parse().
`;

    // create chat completion
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 400,
      temperature: 0.9,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    let aiResult = { title: "", short: "", long: "", raw: text };

    // Try to parse JSON from the model's output
    try {
      // model may send surrounding whitespace
      const jsonStart = text.indexOf("{");
      const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
      aiResult = { ...aiResult, ...(JSON.parse(jsonText) || {}) };
    } catch (err) {
      // fallback: put the whole text into long if parsing fails
      aiResult.long = text.trim();
      aiResult.title = aiResult.title || (name ? `${name}'s Activity` : "Fun Activity");
      aiResult.short = aiResult.short || aiResult.long.split(".")[0] || "";
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiResult,
        userData: body,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
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
