import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      personality,
      locationPref,
      season,
      ageCategory,
      groupSize,
      chaos,
      cityType,
      extraInfo,
      previousActivity = ""
    } = body || {};

    // Repeat prevention (single title → array)
    const previousActivities =
      previousActivity && previousActivity !== "null"
        ? [previousActivity]
        : [];

    // Build constraints dynamically (EMPTY = RANDOM)
    const constraints = [];
    if (personality) constraints.push(`personality: ${personality}`);
    if (locationPref) constraints.push(`inside/outside: ${locationPref}`);
    if (season) constraints.push(`season: ${season}`);
    if (ageCategory) constraints.push(`age category: ${ageCategory}`);
    if (groupSize) constraints.push(`group size: ${groupSize}`);
    if (chaos) constraints.push(`chaos level: ${chaos}`);
    if (cityType) constraints.push(`location type: ${cityType}`);
    if (extraInfo) constraints.push(`extra notes: ${extraInfo}`);

    const constraintText =
      constraints.length > 0
        ? `Constraints: ${constraints.join(", ")}.`
        : "No constraints provided. Generate a completely random activity.";

    const historyText =
      previousActivities.length > 0
        ? previousActivities.map((a) => `- ${a}`).join("\n")
        : "None";

    const randomSeed = Math.random().toString(36).slice(2);

    const userPrompt = `
You are Fun Bot 3000. Suggest ONE engaging, realistic, modern activity.
If no constraints are provided, generate a universally fun, accessible activity.

Randomizer seed: ${randomSeed}

======== DO NOT REPEAT ACTIVITIES =========
Previously generated activities:
${historyText}

You MUST generate a clearly NEW idea.

======== LOCATION RULES =========
• inside → indoor-only
• outside → outdoor-only
• both → must work indoors OR outdoors
• "" → no restriction

======== AGE RULES =========
• kids → playful, simple, supervised
• teenagers → trendy, social, challenges
• adults → creative, social, skill-based
• mixed → universal, flexible

======== GROUP SIZE RULES =========
• solo → independent activities
• 2-4 → cooperative or competitive
• group → scalable, social

======== CHAOS RULES =========
• calm → relaxing, low energy
• littlespicy → energetic but safe
• crazy → bold, high-energy, exciting

======== PERSONALITY RULES =========
• introvert → calm, cozy, creative
• extrovert → outgoing, social, energetic

======== SEASON RULES =========
• winter → cozy, indoor, cold-friendly
• summer → outdoor, water, adventure
• fall → aesthetic, cozy, warm
• spring → bright, nature-focused

======== CITY TYPE RULES =========
• city → urban-friendly, dense-space ideas
• town → simple, accessible, low-density ideas

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
    } catch {
      aiResult.long = text.trim();
      aiResult.short = aiResult.long.split(".")[0] || "";
    }

    return new Response(
      JSON.stringify({ success: true, aiResult }),
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
