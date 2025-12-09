// app/results/page.js
export default async function ResultsPage({ searchParams }) {
  // Pass all search params directly to your API
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // send the form data exactly as-is
    body: JSON.stringify(searchParams),
    cache: "no-store",
  });

  const data = await res.json();

  const result = data?.result || "No activity generated.";

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif", lineHeight: "1.6" }}>
      <h1>Your Fun Activity 🎉</h1>

      <h3>Generated just for you:</h3>

      <div
        style={{
          whiteSpace: "pre-wrap",
          background: "#f8f8f8",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          marginTop: "10px",
          fontSize: "1.1rem",
        }}
      >
        {result}
      </div>

      <h3 style={{ marginTop: "30px" }}>Your Choices:</h3>

      <div
        style={{
          background: "#fafafa",
          padding: "15px",
          borderRadius: "6px",
          border: "1px solid #eee",
        }}
      >
        <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(searchParams, null, 2)}
        </pre>
      </div>
    </div>
  );
}
