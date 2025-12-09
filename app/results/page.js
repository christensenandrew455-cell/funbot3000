// app/results/page.js

export const dynamic = "force-dynamic"; // ⬅️ FIX: prevents prerender errors

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ResultsClient />
    </Suspense>
  );
}

function ResultsClient() {
  "use client";

  const { useState, useEffect } = require("react");
  const { useSearchParams } = require("next/navigation");

  const searchParams = useSearchParams();

  const initialData = Object.fromEntries(searchParams.entries());
  const hasParams = Object.keys(initialData).length > 0;

  const [formData] = useState(hasParams ? initialData : null);
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formData) return;

    async function fetchActivity() {
      setLoading(true);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      setActivity(json.result || "No activity found.");
      setLoading(false);
    }

    fetchActivity();
  }, [formData]);

  if (!formData) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>No information provided</h1>
        <button onClick={() => (window.location.href = "/")}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Your Fun Activity 🎉</h1>

      {loading && <p>Generating activity...</p>}

      {!loading && activity && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginTop: "20px",
            borderRadius: "8px",
          }}
        >
          <h2>Result</h2>

          <p>{activity.split("\n")[0]}</p>

          <details style={{ marginTop: "10px" }}>
            <summary>Full Description</summary>
            <p style={{ marginTop: "10px" }}>{activity}</p>
          </details>

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ marginRight: "10px", padding: "8px 12px" }}
            >
              Generate Again
            </button>

            <button
              onClick={() => (window.location.href = "/")}
              style={{ padding: "8px 12px" }}
            >
              Update Information
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
