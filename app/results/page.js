// app/results/page.js
export default function ResultsPage({ searchParams }) {
  // Force all values to strings so Next.js won't crash
  const safeParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    ])
  );

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Results</h1>

      <pre
        style={{
          background: "#f0f0f0",
          padding: "20px",
          borderRadius: "8px",
          fontSize: "14px",
          overflowX: "auto"
        }}
      >
        {JSON.stringify(safeParams, null, 2)}
      </pre>
    </div>
  );
}
