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
      previousActivities = [] // <-- NEW FIELD FOR NON-REPEAT LOGIC
    } = body || {};

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

    // Convert activity history list into readable text
    const historyText =
      previousActivities.length > 0
        ? previousActivities.map((a) => `- ${a}`).join("\n")
        : "None";

    const randomSeed = Math.random().toString(36).slice(2);

    const userPrompt = `
You are Fun Bot 3000. Suggest ONE engaging, realistic, modern activity.
Use the provided constraints to tailor the activity.

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
• both → activity must be something that works **indoors OR outdoors**
• "" (empty) → no restriction

======== AGE RULES =========
• Ages 12–17:
  - Use modern, trendy, social, energetic, or internet-culture activities.
  - Examples: creative challenges, aesthetic photo missions, TikTok-style trends,
    light adventure, mini-competitions, room-decor DIY, gaming, fun dares,
    friend-based activities.
  - Avoid childish activities (e.g., “make a paper craft”, “play tag”).
  - Avoid boring adult activities (e.g., “have a calm picnic”, “go antique shopping”).
  - Keep tone natural—not cringe—no forced slang.

• Ages 18–30:
  - Creative, social, nightlife, fitness, mini-adventures, food challenges,
    outgoing group ideas, travel-like vibes.

• Ages 31–55:
  - Balanced: creative, relaxing, active, skill-building, hobbies, outdoors.

• Ages 56+:
  - Accessible, enjoyable, light, safe, social or cozy.

• Unknown ages:
  - Just make it fun, modern, and universal.

======== PERSONALITY RULES =========
• introvert → calm, cozy, creative, solo-friendly, low social pressure.
• extrovert → social, energetic, group-based, outgoing, movement or interaction.

======== SEASON RULES =========
• winter → cold-friendly or indoor
• summer → outdoor, water, adventure
• fall → aesthetic, cozy, creative
• spring → nature, bright, outdoors

======== PLACE INFO =========
Consider country/state/city if given; match realism.

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

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 400,
      temperature: 1.05,
      top_p: 1,
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
