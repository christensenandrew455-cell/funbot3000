// app/droplink/page.js
"use client";

import { useState } from "react";

const OVERALL_LABELS = {
  scam: "SCAM",
  untrustworthy: "UNTRUSTWORTHY",
  overpriced: "OVERPRICED",
  "good product": "GOOD PRODUCT",
};

const OVERALL_COLORS = {
  scam: "#dc2626",
  untrustworthy: "#ea580c",
  overpriced: "#d97706",
  "good product": "#16a34a",
};

function normalizeUrl(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

/* crash-proof Stars */
function Stars({ score }) {
  const safeScore =
    typeof score === "number" && score >= 0 ? Math.min(5, Math.round(score)) : 0;

  const full = "★".repeat(safeScore);
  const empty = "☆".repeat(5 - safeScore);

  return (
    <span style={{ color: "#f59e0b", fontSize: 18 }}>
      {full}
      <span style={{ color: "#d1d5db" }}>{empty}</span>
    </span>
  );
}

export default function DropLinkPage() {
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
      <div style={styles.topNav}>
        <a href="/" style={styles.navLink}>← Home</a>
        <div style={styles.navBrand}>Alitrite</div>
      </div>

      <div style={styles.card}>
        {!result && !screenshot && (
          <div style={styles.instructions}>
            <h1 style={styles.heroTitle}>Drop a product link.</h1>
            <p style={styles.heroSubtitle}>
              Paste an <strong>Amazon product link</strong>. We’ll analyze the listing, the seller,
              and pricing signals and return a simple rating — <strong>free</strong>.
            </p>

            <div style={styles.steps}>
              <div style={styles.step}>
                <strong>1.</strong> Open the Amazon product page
              </div>
              <div style={styles.step}>
                <strong>2.</strong> Copy the <strong>full URL</strong> from the address bar
              </div>
              <div style={styles.step}>
                <strong>3.</strong> Paste it below and press <strong>Analyze</strong>
              </div>
            </div>
          </div>
        )}

        {!result && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="url"
              placeholder="Paste the full Amazon product link here…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Processing..." : "Analyze Product"}
            </button>
            <p style={styles.helperText}>
              Tip: copy the URL from the product page (address bar) and paste it here.
            </p>
            <p style={styles.disclaimer}>
              AI can make mistakes. Please verify critical details before you purchase.
            </p>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {screenshot && (
          <div style={{ margin: "24px 0", textAlign: "center" }}>
            <h4>Product Screenshot:</h4>
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
              {OVERALL_LABELS[result.status] || "UNRATED"}
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

            <div style={{ ...styles.section, borderTop: "1px solid #eee", paddingTop: 16 }}>
              <h3>Overall Rating</h3>
              <Stars score={result.overall?.score} />
              <p><strong>{result.overall?.meaning}</strong></p>
              <p>{result.overall?.reason}</p>
              <p style={styles.disclaimer}>
                AI can make mistakes. Use this as guidance, not a guarantee.
              </p>
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
    flexDirection: "column",
    alignItems: "center",
    background: "#f5f7fb",
    padding: 20,
    gap: 16,
  },
  topNav: {
    width: "100%",
    maxWidth: 720,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 4px",
  },
  navBrand: {
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "#0f172a",
  },
  navLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  },
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 720,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  instructions: { marginBottom: 28, textAlign: "center" },
  heroTitle: { fontSize: 30, fontWeight: 900, marginBottom: 10, color: "#0f172a" },
  heroSubtitle: { fontSize: 15, color: "#475569", marginBottom: 20, lineHeight: 1.6 },
  steps: { display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: 14 },
  step: { background: "#f8fafc", padding: 10, borderRadius: 10, border: "1px solid #e2e8f0" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: 14, fontSize: 16, borderRadius: 12, border: "1px solid #dbeafe" },
  button: {
    padding: 14,
    fontSize: 16,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
  },
  helperText: { fontSize: 12, color: "#64748b", textAlign: "center" },
  disclaimer: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 6 },
  error: { color: "#dc2626", marginTop: 12, textAlign: "center", fontWeight: 700 },
  verdict: (status) => ({
    fontSize: 30,
    fontWeight: 900,
    color: OVERALL_COLORS[status] || "#111",
    textAlign: "center",
    marginBottom: 24,
  }),
  section: { marginBottom: 18 },
};
