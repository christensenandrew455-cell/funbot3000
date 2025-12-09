// app/results/page.js
export default function ResultsPage({ searchParams }) {
  // searchParams contains string values
  // result was encoded on the client; decode it here
  const rawResult = searchParams?.result ? decodeURIComponent(searchParams.result) : null;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif", lineHeight: "1.6" }}>
      <h1>Your Fun Activity 🎉</h1>

      {rawResult ? (
        <div
          style={{
            whiteSpace: "pre-wrap",
            background: "#f8f8f8",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginTop: "10px",
            fontSize: "1.05rem",
          }}
        >
          {rawResult}
        </div>
      ) : (
        <p style={{ color: "red" }}>No AI result received.</p>
      )}

      <h3 style={{ marginTop: "30px" }}>Your Inputs</h3>
      <div style={{ background: "#fafafa", padding: "15px", borderRadius: "6px", border: "1px solid #eee" }}>
        <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(Object.fromEntries(Object.entries(searchParams).filter(([k]) => k !== "result")), null, 2)}
        </pre>
      </div>
    </div>
  );
}
