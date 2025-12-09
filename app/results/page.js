export default function ResultsPage({ searchParams }) {
  const { result, ...userInputs } = searchParams;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", lineHeight: "1.6" }}>
      <h1>Your Fun Activity 🎉</h1>

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
{JSON.stringify(userInputs, null, 2)}
        </pre>
      </div>
    </div>
  );
}
