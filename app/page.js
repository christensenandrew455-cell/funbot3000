"use client";

import { useState } from "react";

function normalizeUrl(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setError("Please enter a valid product link.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setResult(data.aiResult);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Product Link Analyzer</h1>

        {!result && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="url"
              placeholder="Enter a product link (Amazon, Walmart, etc.)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Processing..." : "Analyze Product"}
            </button>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <>
            <div style={styles.verdict(result.status)}>
              {result.status === "good" ? "GOOD PRODUCT" : "POTENTIAL SCAM"}
            </div>

            <div style={styles.section}>
              <h3>Summary</h3>
              <p>{result.review}</p>
            </div>

            <div style={styles.section}>
              <h3>Title</h3>
              <p>{result.title || "No title detected"}</p>
            </div>

            <div style={styles.section}>
              <h3>Seller Trust</h3>
              <p>{result.sellerTrust || "Unknown"}</p>
            </div>

            <div style={styles.section}>
              <h3>Confidence</h3>
              <p>{result.confidence || "Unknown"}</p>
            </div>

            {result.status === "bad" && result.alternative && (
              <div style={styles.section}>
                <h3>Alternative Product</h3>
                <a href={result.alternative} target="_blank" rel="noreferrer">
                  {result.alternative}
                </a>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
              <input
                type="url"
                placeholder="Check another product link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Processing..." : "Analyze Another"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    padding: 20,
  },
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: 14, fontSize: 16, borderRadius: 10, border: "1px solid #ddd" },
  button: {
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "#4A6CF7",
    color: "#fff",
    fontWeight: 600,
  },
  error: { color: "red", marginTop: 12 },
  verdict: (status) => ({
    fontSize: 36,
    fontWeight: 900,
    color: status === "good" ? "#16a34a" : "#dc2626",
    marginBottom: 24,
  }),
  section: { textAlign: "left", marginBottom: 16 },
};
