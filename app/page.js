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
  const [screenshot, setScreenshot] = useState(null); // NEW
  const [productInfo, setProductInfo] = useState(null);
  const [priceComparisons, setPriceComparisons] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setScreenshot(null);
    setProductInfo(null);
    setPriceComparisons([]);

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setError("Please enter a valid product link.");
      return;
    }

    setLoading(true);
    try {
      // Fetch AI analysis and screenshot in one request
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      setScreenshot(data.base64 || null); // screenshot base64
      setResult(data.aiResult || null);    // AI evaluation
      setProductInfo(data.productInfo || null);
      setPriceComparisons(data.priceComparisons || []);
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

            <div style={styles.steps}>
              <div style={styles.step}>
                <strong>1.</strong> Find a product that looks suspicious or overpriced
              </div>
@@ -107,50 +113,114 @@ export default function Home() {

        {error && <p style={styles.error}>{error}</p>}

        {/* NEW: Display screenshot temporarily */}
        {screenshot && (
          <div style={{ margin: "24px 0", textAlign: "center" }}>
            <h4>Product Screenshot:</h4>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Product screenshot"
              style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
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
                    <strong>Seller:</strong>
                    <div>{productInfo.seller || "Not detected"}</div>
                  </div>
                  <div>
                    <strong>Price:</strong>
                    <div>{productInfo.price || "Not detected"}</div>
                  </div>
                  <div>
                    <strong>Rating:</strong>
                    <div>
                      {productInfo.stars ? `${productInfo.stars}★` : "Not detected"}
                    </div>
                  </div>
                  <div>
                    <strong>Review Count:</strong>
                    <div>
                      {productInfo.reviewCount ?? "Not detected"}
                    </div>
                  </div>
                </div>
                {productInfo.features?.length ? (
                  <ul style={styles.featuresList}>
                    {productInfo.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.muted}>No visible product features detected.</p>
                )}
              </div>
            )}

            {!!priceComparisons.length && (
              <div style={styles.section}>
                <h4>Price Checks</h4>
                <p style={styles.muted}>
                  We scanned similar listings for public pricing signals.
                </p>
                <div style={styles.priceList}>
                  {priceComparisons.slice(0, 4).map((entry, index) => (
                    <div key={`${entry.url}-${index}`} style={styles.priceItem}>
                      <div style={styles.priceTitle}>{entry.title}</div>
                      <div style={styles.priceMeta}>
                        <span>${entry.price.toFixed(2)}</span>
                        {entry.url && (
                          <a href={entry.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        )}
                      </div>
                      {entry.snippet && (
                        <div style={styles.priceSnippet}>{entry.snippet}</div>
                      )}
                    </div>
                  ))}
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

            <div
              style={{
                ...styles.section,
                borderTop: "1px solid #eee",
                paddingTop: 16,
              }}
            >
@@ -172,26 +242,34 @@ export default function Home() {
          <li>We aim to help people avoid these scams and make smarter purchases.</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", background: "#f5f7fb", padding: 20, gap: 24 },
  card: { background: "#fff", padding: 32, borderRadius: 16, width: "100%", maxWidth: 540, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" },
  cardFacts: { background: "#fff", padding: 40, borderRadius: 16, width: "100%", maxWidth: 540, boxShadow: "0 12px 36px rgba(0,0,0,0.12)", marginTop: 16 },
  instructions: { marginBottom: 28, textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 800, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, color: "#555", marginBottom: 20 },
  steps: { display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: 14 },
  step: { background: "#f9fafb", padding: 10, borderRadius: 8 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: 14, fontSize: 16, borderRadius: 10, border: "1px solid #ddd" },
  button: { padding: 14, fontSize: 16, borderRadius: 10, border: "none", cursor: "pointer", background: "#4A6CF7", color: "#fff", fontWeight: 600 },
  helperText: { fontSize: 12, color: "#666", textAlign: "center" },
  factsTitle: { fontSize: 26, fontWeight: 700, marginBottom: 24, textAlign: "center" },
  factsList: { listStyle: "disc", paddingLeft: 24, fontSize: 16, color: "#333", lineHeight: 2 },
  error: { color: "red", marginTop: 12, textAlign: "center" },
  verdict: (status) => ({ fontSize: 28, fontWeight: 900, color: status === "good" ? "#16a34a" : "#dc2626", textAlign: "center", marginBottom: 24 }),
  section: { marginBottom: 18 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 },
  featuresList: { marginTop: 12, paddingLeft: 18, color: "#374151", fontSize: 14, lineHeight: 1.6 },
  muted: { color: "#6b7280", fontSize: 13 },
  priceList: { display: "grid", gap: 12, marginTop: 12 },
  priceItem: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#f9fafb" },
  priceTitle: { fontWeight: 600, marginBottom: 6, color: "#111827" },
  priceMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#374151", marginBottom: 6 },
  priceSnippet: { fontSize: 12, color: "#4b5563" },
};
