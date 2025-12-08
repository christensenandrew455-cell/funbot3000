export async function POST(request) {
  const data = await request.json();

  // later you'll send this to AI
  console.log("Received:", data);

  return Response.json({ ok: true, message: "AI not connected yet" });
}
