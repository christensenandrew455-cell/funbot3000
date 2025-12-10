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
      country,
      state,
      city,

      // 🔥 FIX: Your frontend sends ONE string, not an array.
      // Convert it into an array so your repeat-prevention still works.
      previousActivity = ""
    } = body || {};

    // Convert single string into array
    const previousActivities =
      previousActivity && previousActivity !== "null"
        ? [previousActivity]
        : [];

    // Build constraints list
    const constraints = [];
    if (personality) constraints.push(`personality: ${personality}`);
    if (locationPref) constraints.push(`inside/outside: ${locationPref}`);
    if (season) constraints.push(`season: ${season}`);
    if (minAge) constraints.push(`minAge: ${minAge}`);
    if (maxAge) constraints.push(`maxAge: ${maxAge}`);
    if (numPeople) constraints.push(`numPeople: ${numPeople}`);
    if (country) constraints.push(`country: ${country}`);
    if (state) constraints.push(`state: ${state}`);
    if (city) constraints.push(`city: ${city}`);
    if (extraInfo) constraints.push(`extra: ${extraInfo}`);

    const constraintText =
      constraints.length > 0
        ? `Constraints: ${constraints.join(", ")}.`
        : "No constraints provided.";

    // Activity history
    const historyText =
      previousActivities.length > 0
        ? previousActivities.map((a) => `- ${a}`).join("\n")
        : "None";

    const randomSeed = Math.random().toString(36).slice(2);

    // ------------------------------
    // MAIN PROMPT (kept exactly like your style)
    // ------------------------------
    const userPrompt = `
You are Fun Bot 3000. Suggest ONE engaging, realistic, modern activity.
Use the provided constraints to tailor the activity. If you are givin no info 
generate a activity that is fun for all ages all places and doable for all
types of people.

Randomizer seed: ${randomSeed}

======== DO NOT REPEAT ACTIVITIES =========
The user already received these activities:
${historyText}

You MUST NOT output anything similar to these previous titles or ideas.
Always create a **NEW** activity that differs clearly.

======== LOCATION RULE FIX =========
The field "locationPref" may be:
• inside → indoor-only ideas
• outside → outdoor-only ideas
• both → must work indoors OR outdoors
• "" → no restriction

======== AGE RULES =========
• Ages 12–17: modern, trendy, social, challenges, aesthetic, gaming, dares.
  Avoid childish or boring adult tasks.
• Ages 18–30: creative, social, fitness, nightlife, adventure, food challenges.
• Ages 31–55: balanced, relaxing, skill-building, hobby, outdoors.
• Ages 56+: accessible, light, cozy, social.
• Unknown -> universal modern fun.

======== PERSONALITY RULES =========
• introvert → calm, cozy, creative
• extrovert → outgoing, social, energetic

======== SEASON RULES =========
• winter → cozy, indoor, cold-friendly
• summer → adventure, water, outdoor
• fall → aesthetic, cozy, warm
• spring → nature, bright, outdoors

======== LOCATION DATA =========
Country/state/city provided should influence realism.

======== OUTPUT FORMAT =========
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

    // ------------------------------
    // CALL OPENAI
    // ------------------------------
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 400,
      temperature: 1.05,
      top_p: 1,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    let aiResult = { title: "", short: "", long: "", raw: text };

    // Try parsing JSON
    try {
      const jsonStart = text.indexOf("{");
      const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
      aiResult = { ...aiResult, ...(JSON.parse(jsonText) || {}) };
    } catch (err) {
      // fallback
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
