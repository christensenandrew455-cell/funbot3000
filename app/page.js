"use client";

import { useState } from "react";

function normalizeUrl(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

/* 🔧 FIX: make Stars crash-proof */
function Stars({ score }) {
  const safeScore =
    typeof score === "number" && score >= 0 ? Math.min(5, score) : 0;

  const full = "★".repeat(safeScore);
  const empty = "☆".repeat(5 - safeScore);

  return (
    <span style={{ color: "#f59e0b", fontSize: 18 }}>
      {full}
      <span style={{ color: "#d1d5db" }}>{empty}</span>
    </span>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [screenshot, setScreenshot] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setScreenshot(null);

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

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      setScreenshot(data.base64 || null);
      setResult(data.aiResult || null);
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
        {!result && !screenshot && (
          <div style={styles.instructions}>
            <h1 style={styles.heroTitle}>
              Found a product that doesn’t look right?
            </h1>
            <p style={styles.heroSubtitle}>
              Drop the product link below and we’ll analyze it for scams, fake quality,
              and overpriced listings — <strong>free</strong>.
            </p>
          </div>
        )}

        {!result && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="url"
              placeholder="Paste the full product link here…"
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

        {screenshot && (
          <div style={{ margin: "24px 0", textAlign: "center" }}>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Product screenshot"
              style={{ maxWidth: "100%", borderRadius: 12 }}
            />
          </div>
        )}

        {result && (
          <>
            <div style={styles.verdict(result.status)}>
              {result.status === "good" ? "GOOD PRODUCT" : "POTENTIAL SCAM"}
            </div>

            <div style={styles.section}>
              <h3>{result.title || "Product Title Not Detected"}</h3>
            </div>

            <div style={styles.section}>
              <h4>Website Trust</h4>
              <Stars score={result.websiteTrust?.score} />
              <p>{result.websiteTrust?.reason}</p>
            </div>

            <div style={styles.section}>
              <h4>Seller Trust</h4>
              <Stars score={result.sellerTrust?.score} />
              <p>{result.sellerTrust?.reason}</p>
            </div>

            <div style={styles.section}>
              <h4>Product Trust</h4>
              <Stars score={result.productTrust?.score} />
              <p>{result.productTrust?.reason}</p>
            </div>

            <div style={{ ...styles.section, borderTop: "1px solid #eee" }}>
              <h3>Overall Rating</h3>
              <Stars score={result.overall?.score} />
              <p>{result.overall?.reason}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f5f7fb", padding: 20 },
  card: { background: "#fff", padding: 32, borderRadius: 16, maxWidth: 540, margin: "0 auto" },
  instructions: { marginBottom: 24, textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 800 },
  heroSubtitle: { fontSize: 15, color: "#555" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: 14, fontSize: 16, borderRadius: 10, border: "1px solid #ddd" },
  button: { padding: 14, fontSize: 16, borderRadius: 10, border: "none", background: "#4A6CF7", color: "#fff" },
  error: { color: "red", textAlign: "center" },
  verdict: (status) => ({ fontSize: 28, fontWeight: 900, color: status === "good" ? "#16a34a" : "#dc2626" }),
  section: { marginBottom: 18 },
};
