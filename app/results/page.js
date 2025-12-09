// app/results/page.js
async function fetchResults(query) {
  // If no query passed, return nothing
  if (!query) return null;

  try {
    // Replace with your actual endpoint:
    const res = await fetch(`https://api.detestifyai.com/analyze?text=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store" // required so Next.js doesn’t cache your API response
    });

    if (!res.ok) throw new Error("API request failed");
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

export default async function ResultsPage({ searchParams }) {
  const query = searchParams?.q || ""; // Example: /results?q=hello
  const results = await fetchResults(query);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: "10px" }}>Detection Results</h1>

      {/* QUERY BOX */}
      <div
        style={{
          background: "#fafafa",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #eee"
        }}
      >
        <strong>Input:</strong>
        <div style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
          {query || "No text provided."}
        </div>
      </div>

      {/* RESULTS */}
      {!query ? (
        <p>Enter text on the homepage to analyze it.</p>
      ) : results?.error ? (
        <div
          style={{
            padding: "15px",
            borderRadius: "8px",
            background: "#ffe6e6",
            border: "1px solid #ffb3b3"
          }}
        >
          <strong>Error:</strong> {results.error}
        </div>
      ) : !results ? (
        <p>Loading…</p>
      ) : (
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            background: "#f0f0f0",
            border: "1px solid #ddd"
          }}
        >
          <h2>Results</h2>
          <pre style={{ marginTop: "10px", overflowX: "auto" }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

