// app/api/generate/route.js
export async function POST(request) {
  try {
    const data = await request.json().catch(() => ({}));
    // normalize
    const {
      peopleCount,
      ageMin,
      ageMax,
      personality,
      country,
      state,
      city,
      activityLocation,
      season,
      note
    } = (data || {});

    const hasAny = [peopleCount, ageMin, ageMax, personality, country, state, city, activityLocation, season, note].some(v => v !== undefined && v !== "" && v !== null);

    // helper text builder
    function summaryList() {
      const items = [];
      if (season) items.push(`season: ${season}`);
      if (personality) items.push(`personality: ${personality}`);
      if (peopleCount) items.push(`people: ${peopleCount}`);
      if (country) items.push(`country: ${country}`);
      if (state) items.push(`state: ${state}`);
      if (city) items.push(`city: ${city}`);
      if (ageMin || ageMax) items.push(`age range: ${ageMin || "any"}-${ageMax || "any"}`);
      if (activityLocation) items.push(`location: ${activityLocation}`);
      if (note) items.push(`note: ${note}`);
      return items;
    }

    // a tiny internal "engine" to pick/generate an activity title and descriptions.
    function randChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // If no info, give a general random activity
    if (!hasAny) {
      const titles = [
        "Neighborhood Scavenger Walk",
        "Storytelling Picnic",
        "DIY Mini-Olympics",
        "Community Recipe Swap",
        "Creative Photo Challenge"
      ];
      const title = randChoice(titles);
      const quick = `A fun, flexible activity that works for any age and any group size — quick to set up and easy to enjoy.`;
      const detail = `This activity is designed to be inclusive and low-prep. Pick a nearby park or a comfortable indoor space. Create a short list of simple prompts (items to find, themes to photograph, or silly challenges). If groups are large, split into teams; if solo, treat it as a creative personal challenge. The focus is on playful exploration, laughter, and low pressure so everyone can join in regardless of age or experience.`;
      return new Response(JSON.stringify({
        ok: true,
        title, quick, detail,
        meta: { generatedAt: new Date().toISOString(), inputs: {} }
      }), { status: 200 });
    }

    // If we have info, build a prompt-like summary and create an activity tailored to that summary.
    const summary = summaryList();
    // pick a base activity depending on personality / location
    let basePool = [
      { id: "photo_walk", title: "City Photo Walk", base: "Go on a themed photo walk around your area" },
      { id: "picnic_game", title: "Themed Picnic & Games", base: "Host a small themed picnic with short games" },
      { id: "mini_maker", title: "Mini Maker Challenge", base: "Hold a creative maker challenge with recycled materials" },
      { id: "park_challenges", title: "Park Challenge Relay", base: "Set up a light relay or challenge course at a park" },
      { id: "cozy_movie", title: "Cozy Movie & Snack Night", base: "Create a cozy at-home movie night with a twist" }
    ];

    // adjust basePool with hints:
    if (personality === "introvert") basePool = basePool.filter(b => b.id !== "park_challenges");
    if (activityLocation === "inside") basePool = basePool.filter(b => b.id !== "park_challenges" && b.id !== "photo_walk");
    if (activityLocation === "outside") basePool = basePool.filter(b => b.id !== "cozy_movie" && b.id !== "mini_maker");
    if (Number(peopleCount) > 8) basePool.push({ id: "community_fair", title: "Mini Community Fair", base: "Organize a mini fair with stations" });

    // fallback if emptied
    if (basePool.length === 0) basePool = [
      { id: "photo_walk", title: "City Photo Walk", base: "Go on a themed photo walk around your area" }
    ];

    const pick = randChoice(basePool);
    // build quick and detail using the summary
    const quick = (() => {
      const s = summary.slice(0, 4).join(" · ");
      return `${pick.base}. Quick: ${s ? s + " · " : ""}Easy to set up and adaptable.`;
    })();

    const detail = (() => {
      const lines = [];
      lines.push(`Overview: ${pick.base}.`);
      if (summary.length) {
        lines.push(`Personalization: ${summary.join("; ")}.`);
      }
      // tailor sentences
      if (personality === "introvert") {
        lines.push(`Pacing: Designed to be low-pressure — people can participate quietly or in small groups.`);
      } else if (personality === "extrovert") {
        lines.push(`Pacing: Add competitive or collaborative twists to make it lively and social.`);
      }

      if (activityLocation === "outside") {
        lines.push(`Location tips: Choose a safe outdoor spot like a park or pedestrian area; bring water and simple supplies.`);
      } else if (activityLocation === "inside") {
        lines.push(`Location tips: Use a living room, community hall, or indoor space with room to move and a table for materials.`);
      } else {
        lines.push(`Location tips: This works either indoors or outdoors — pick what's easiest for your group or the weather.`);
      }

      if (peopleCount) {
        lines.push(`Group size: For ${peopleCount} people, split into teams or create rotating stations so everyone stays engaged.`);
      } else {
        lines.push(`Group size: This activity scales — it is fine for one person or many.`);
      }

      // add a "how to" mini paragraph
      lines.push(`How to run it: Prepare 5–10 short prompts or mini-challenges (themes for photos, short recipes, quick craft prompts, or scavenger items). Give each team or person 20–40 minutes depending on age range and time available. After the activity, gather for a short share where everyone shows a highlight — this part is optional but builds connection and fun.`);

      return lines.join(" ");
    })();

    return new Response(JSON.stringify({
      ok: true,
      title: pick.title,
      quick,
      detail,
      meta: {
        generatedAt: new Date().toISOString(),
        inputs: { peopleCount, ageMin, ageMax, personality, country, state, city, activityLocation, season, note }
      }
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
