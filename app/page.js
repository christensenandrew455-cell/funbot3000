"use client";

import { useState } from "react";

function normalizeUrl(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

function Stars({ score }) {
  const full = "★".repeat(score);
  const empty = "☆".repeat(5 - score);
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

        {/* TOP INSTRUCTIONS */}
        {!result && (
          <div style={styles.instructions}>
            <h1 style={styles.heroTitle}>
              Found a product that doesn’t look right?
            </h1>
            <p style={styles.heroSubtitle}>
              Drop the product link below and we’ll analyze it for scams, fake quality,
              and overpriced listings — <strong>free</strong>.
            </p>

            <div style={styles.steps}>
              <div style={styles.step}>
                <strong>1.</strong> Find a product that looks suspicious or overpriced
              </div>
              <div style={styles.step}>
                <strong>2.</strong> Copy the <strong>full product link</strong>  
                (Ctrl + C on desktop, or tap and copy on mobile)
              </div>
              <div style={styles.step}>
                <strong>3.</strong> Paste it below and press <strong>Analyze</strong>
              </div>
            </div>
          </div>
        )}

        {/* INPUT */}
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
            <p style={styles.helperText}>
              Copy the link from the product page → paste it here → analyze.
            </p>
          </form>
        )}

        {/* WHY IT MATTERS BOX */}
        <div style={styles.factsBox}>
          <h2 style={styles.factsTitle}>Why It Matters</h2>
          <ul style={styles.factsList}>
            <li>Nearly <strong>1 in 3 shoppers</strong> report being scammed online.</li>
            <li>Many Amazon and online listings are dropshippers reselling products at double or triple the original price.</li>
            <li>Fake or manipulated reviews are common, making it hard to trust product ratings.</li>
            <li>Online scams cost consumers and businesses billions every year.</li>
            <li>We aim to help people avoid these scams and make smarter purchases.</li>
          </ul>
        </div>

        {error && <p style={styles.error}>{error}</p>}

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
              <Stars score={result.websiteTrust.score} />
              <p>{result.websiteTrust.reason}</p>
            </div>

            <div style={styles.section}>
              <h4>Seller Trust</h4>
              <Stars score={result.sellerTrust.score} />
              <p>{result.sellerTrust.reason}</p>
            </div>

            <div style={styles.section}>
              <h4>Product Trust</h4>
              <Stars score={result.productTrust.score} />
              <p>{result.productTrust.reason}</p>
            </div>

            <div
              style={{
                ...styles.section,
                borderTop: "1px solid #eee",
                paddingTop: 16,
              }}
            >
              <h3>Overall Rating</h3>
              <Stars score={result.overall.score} />
              <p>{result.overall.reason}</p>
            </div>
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
    alignItems: "flex-start",
    background: "#f5f7fb",
    padding: 20,
  },
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 540,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    marginBottom: 40,
  },
  instructions: {
    marginBottom: 28,
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textAlign: "left",
    fontSize: 14,
  },
  step: {
    background: "#f9fafb",
    padding: 10,
    borderRadius: 8,
  },
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
  helperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  factsBox: {
    marginTop: 32,
    background: "#e0f2fe",
    padding: 24,
    borderRadius: 16,
  },
  factsTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: "center",
  },
  factsList: {
    listStyle: "disc",
    paddingLeft: 20,
    fontSize: 14,
    color: "#333",
    lineHeight: 1.6,
  },
  error: { color: "red", marginTop: 12, textAlign: "center" },
  verdict: (status) => ({
    fontSize: 28,
    fontWeight: 900,
    color: status === "good" ? "#16a34a" : "#dc2626",
    textAlign: "center",
    marginBottom: 24,
  }),
  section: { marginBottom: 18 },
};
