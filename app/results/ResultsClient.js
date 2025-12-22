"use client";

import { useEffect, useState } from "react";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    flexDirection: "column",
    background: "linear-gradient(to right, #f0f4ff, #ffffff)",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    maxWidth: 720,
    width: "100%",
    textAlign: "center",
  },
  buttonPrimary: {
    background: "#4A6CF7",
    color: "white",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonSecondary: {
    background: "#f1f1f1",
    color: "#333",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 16,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    marginTop: 6,
  },
  resultBox: {
    background: "#f1f3f6",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    textAlign: "left",
    wordBreak: "break-word",
  },
};

export default function ResultsClient() {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");

  async function fetchAi(submitUrl) {
    if (!submitUrl) {
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
        body: JSON.stringify({ url: submitUrl }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setAiResult(data.aiResult);
    } catch (err) {
      console.error(err);
      setError("Failed to generate review. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{ marginBottom: 12 }}>Link Review AI</h1>
        <input
          type="url"
          placeholder="Enter product or website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={styles.input}
        />
        <div style={{ marginTop: 12 }}>
          <button
            style={styles.buttonPrimary}
            onClick={() => fetchAi(url)}
            disabled={loading}
          >
            {loading ? "Processing..." : "Generate Review"}
          </button>
        </div>

        {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

        {aiResult && (
          <div style={styles.resultBox}>
            <p>
              <strong>Type:</strong> {aiResult.type}
            </p>
            <p>
              <strong>Title:</strong> {aiResult.title || "N/A"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {aiResult.status === "good" ? "Good 👍" : "Bad 👎"}
            </p>
            <p>
              <strong>Review:</strong> {aiResult.review}
            </p>
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
    </div>
  );
}
