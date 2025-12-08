export async function POST(req) {
  const data = await req.json();
  // Just return dummy result for now
  return new Response(JSON.stringify({
    activity: "Sample Activity",
    quick: "A quick description of the activity.",
    full: "A detailed paragraph describing how to do the activity."
  }), { status: 200 });
}
