"use client";

import { useState } from "react";

function normalizeUrl(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

/* ===================== STAR LOGIC ===================== */

function starsForStatus(status) {
  switch (status) {
    case "scam":
      return 1;
    case "untrustworthy":
      return 2;
    case "overpriced":
      return 3;
    case "good product":
      return 4;
    default:
      return 0;
  }
}

function StarRating({ value }) {
  return (
    <div style={{ fontSize: 22, marginBottom: 8 }}>
      {"★★★★★".slice(0, value)}
      <span style={{ color: "#ddd" }}>
        {"★★★★★".slice(value)}
      </span>
    </div>
  );
}

/* ===================== PAGE ===================== */

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

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setResult(data.aiResult || null);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {!result && (
          <>
            <h1 style={styles.heroTitle}>
              Found a product that doesn’t look right?
            </h1>
            <p style={styles.heroSubtitle}>
              Paste a product link and we’ll flag scams, untrustworthy sellers,
              overpriced listings, and good products.
            </p>

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
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <>
            <StarRating value={starsForStatus(result.status)} />

            <div style={styles.verdict(result.status)}>
              {result.status.toUpperCase()}
            </div>

            <div style={styles.section}>
              <h3>{result.title}</h3>
              <p>{result.reason}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: 20,
    display: "flex",
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 540,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  heroTitle: { fontSize: 28, fontWeight: 800, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, color: "#555", marginBottom: 20 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    border: "1px solid #ddd",
  },
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
  error: { color: "red", marginTop: 12, textAlign: "center" },
  verdict: (status) => ({
    fontSize: 26,
    fontWeight: 900,
    textAlign: "center",
    marginBottom: 14,
    color:
      status === "good product"
        ? "#16a34a"
        : status === "overpriced"
        ? "#d97706"
        : "#dc2626",
  }),
  section: { marginBottom: 18 },
};
