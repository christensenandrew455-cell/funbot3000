"use client";

import { useState } from "react";

/* ===================== HELPERS ===================== */

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

/* ===================== PAGE ===================== */

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [productInfo, setProductInfo] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setResult(null);
    setScreenshot(null);
    setProductInfo(null);

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
      setProductInfo(data.productInfo || null);
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
              Drop the product link below and we’ll analyze it for scams, fake
              quality, and overpriced listings — <strong>free</strong>.
            </p>

            <div style={styles.steps}>
              <div style={styles.step}>
                <strong>1.</strong> Find a product that looks suspicious
              </div>
              <div style={styles.step}>
                <strong>2.</strong> Copy the product link
              </div>
              <div style={styles.step}>
                <strong>3.</strong> Paste it below and analyze
              </div>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                style={styles.input}
                placeholder="Paste product URL here"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button style={styles.button} disabled={loading}>
                {loading ? "Analyzing…" : "Analyze Product"}
              </button>
            </form>

            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}

        {screenshot && (
          <div style={{ margin: "24px 0", textAlign: "center" }}>
            <h4>Product Screenshot</h4>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Product screenshot"
              style={{
                maxWidth: "100%",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
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

            {productInfo && (
              <div style={styles.section}>
                <h4>Extracted Details</h4>
                <div style={styles.detailGrid}>
                  <div>
                    <strong>Seller</strong>
                    <div>{productInfo.seller || "Not detected"}</div>
                  </div>
                  <div>
                    <strong>Price</strong>
                    <div>{productInfo.price || "Not detected"}</div>
                  </div>
                  <div>
                    <strong>Rating</strong>
                    <div>
                      {productInfo.stars
                        ? `${productInfo.stars}★`
                        : "Not detected"}
                    </div>
                  </div>
                  <div>
                    <strong>Reviews</strong>
                    <div>{productInfo.reviewCount ?? "Not detected"}</div>
                  </div>
                </div>
              </div>
            )}

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
    display: "flex",
    justifyContent: "center",
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
  },
  instructions: { textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 800 },
  heroSubtitle: { fontSize: 15, color: "#555", marginBottom: 20 },
  steps: { display: "flex", flexDirection: "column", gap: 8 },
  step: { background: "#f9fafb", padding: 10, borderRadius: 8 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 },
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
    background: "#4A6CF7",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { color: "red", marginTop: 12 },
  verdict: (status) => ({
    fontSize: 28,
    fontWeight: 900,
    textAlign: "center",
    color: status === "good" ? "#16a34a" : "#dc2626",
    marginBottom: 24,
  }),
  section: { marginBottom: 18 },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    marginTop: 12,
  },
};
