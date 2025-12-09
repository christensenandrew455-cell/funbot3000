// app/results/page.js
export default async function ResultsPage({ searchParams }) {
  let data = null;
  let error = null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL ? '' : ''}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchParams),
      cache: "no-store",
    });

    data = await res.json();
  } catch (err) {
    error = err.message;
  }

  const result = data?.result;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif", lineHeight: "1.6" }}>
      <h1>Your Fun Activity 🎉</h1>

      {error && (
        <div style={{ color: "red", marginTop: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!error && !result && (
        <p>Generating your activity…</p>
      )}

      {result && (
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
      )}

      <h3 style={{ marginTop: "30px" }}>Your Inputs:</h3>

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
