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
      previousActivity = "",
    } = body || {};

    const previousActivities =
      previousActivity && previousActivity !== "null"
        ? [previousActivity]
        : [];

    const constraints = [];
    if (personality) constraints.push(`personality=${personality}`);
    if (locationPref) constraints.push(`locationPref=${locationPref}`);
    if (season) constraints.push(`season=${season}`);
    if (ageCategory) constraints.push(`ageCategory=${ageCategory}`);
    if (groupSize) constraints.push(`groupSize=${groupSize}`);
    if (chaos) constraints.push(`chaos=${chaos}`);
    if (cityType) constraints.push(`cityType=${cityType}`);
    if (extraInfo) constraints.push(`extraInfo=${extraInfo}`);

    const constraintText =
      constraints.length > 0
        ? constraints.join(", ")
        : "none (fully random)";

    const historyText =
      previousActivities.length > 0
        ? previousActivities.map((a) => `- ${a}`).join("\n")
        : "none";

    const randomSeed = Math.random().toString(36).slice(2);

    const prompt = `
You are Fun Bot 3000.
Generate EXACTLY ONE activity idea.

Random seed: ${randomSeed}

================= PREVIOUS ACTIVITIES =================
${historyText}
You MUST NOT repeat or closely resemble these.

================= HARD RULE ENFORCEMENT =================
If ANY rule below is violated, the activity is INVALID and must be regenerated internally before responding.

----- PERSONALITY -----
introvert:
- MUST be calm, quiet, low-stimulation
- MUST be solo or with close friends only
- MUST NOT involve crowds, competition, performance, or strangers

extrovert:
- MUST involve other people OR public interaction
- MUST be social, collaborative, competitive, or expressive
- MUST NOT be solo
- MUST NOT be quiet hobbies
- MUST NOT include DIY, crafts, journaling, terrariums, or personal projects

----- CHAOS LEVEL -----
calm:
- relaxing, low energy
- no adrenaline, no competition

littlespicy:
- energetic but safe
- mild competition or movement allowed

crazy:
- high energy, bold, exciting
- strong movement, challenge, or intensity required

----- GROUP SIZE -----
solo:
- must work completely alone

2-4:
- must require interaction between a few people

group:
- must scale to 5+ people
- social or coordinated by nature

----- AGE CATEGORY -----
kids:
- simple, playful, supervised
- no complex rules, no risk

teenagers:
- trendy, social, challenge-based
- no childish activities

adults:
- mature, social, creative, or skill-based
- no childish activities

mixed:
- universally accessible
- flexible and inclusive

----- LOCATION (INSIDE / OUTSIDE) -----
inside:
- indoor-only

outside:
- outdoor-only

both:
- must work indoors OR outdoors

----- SEASON -----
winter:
- cold-friendly or indoor

summer:
- outdoor, water, or high-energy

fall:
- cozy, aesthetic, moderate energy

spring:
- fresh, bright, nature-friendly

----- CITY TYPE -----
city:
- dense-space friendly
- no large open land assumptions

town:
- accessible, lower density
- no urban-only infrastructure

================= OUTPUT RULES =================
Return ONLY valid JSON.
No markdown.
No commentary.
No explanations.

{
  "title": "3-6 word title",
  "short": "10-20 word summary",
  "long": "2-4 sentence description"
}

================= USER CONSTRAINTS =================
${constraintText}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.95,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    let aiResult = { title: "", short: "", long: "", raw: text };

    try {
      const jsonStart = text.indexOf("{");
      const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
      aiResult = { ...aiResult, ...JSON.parse(jsonText) };
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
      { status: 500 }
    );
  }
}
