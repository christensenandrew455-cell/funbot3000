"use client";

import { useState } from "react";

export default function ResultsClient() {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");

  async function fetchAi() {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setAiResult(data.aiResult);
    } catch (err) {
      console.error(err);
      setError("Failed to generate review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Link Review AI</h1>

      <input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ padding: 12, width: "100%", marginBottom: 12 }}
      />

      <button onClick={fetchAi} disabled={loading}>
        {loading ? "Processing..." : "Generate Review"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {aiResult && (
        <div style={{ marginTop: 20 }}>
          <p><strong>Type:</strong> {aiResult.type}</p>
          <p><strong>Title:</strong> {aiResult.title}</p>
          <p><strong>Status:</strong> {aiResult.status}</p>
          <p><strong>Review:</strong> {aiResult.review}</p>

          {aiResult.status === "bad" && aiResult.alternative && (
            <p>
              <strong>Alternative:</strong>{" "}
              <a href={aiResult.alternative} target="_blank" rel="noreferrer">
                {aiResult.alternative}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
