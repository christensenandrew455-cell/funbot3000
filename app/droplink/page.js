// app/droplink/page.js
"use client";

import { useMemo, useState } from "react";

const OVERALL_LABELS = {
  scam: "SCAM",
  untrustworthy: "UNTRUSTWORTHY",
  overpriced: "BAD VALUE",
  "good product": "GOOD PRODUCT",
};

const OVERALL_COLORS = {
  scam: "#dc2626",
  untrustworthy: "#ea580c",
  overpriced: "#d97706",
  "good product": "#16a34a",
};

function LogoMark({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Alitrite"
      style={{ display: "block" }}
    >
      <path
        d="M30 10 L12 54 H20 L24 44 H40 L44 54 H52 L34 10 Z M27 36 L32 22 L37 36 Z"
        fill="#2563eb"
      />
      <circle
        cx="45"
        cy="23"
        r="10"
        fill="none"
        stroke="#0f172a"
        strokeWidth="4"
      />
      <path
        d="M52 30 L60 38"
        stroke="#0f172a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M39 22 H51 M39 26 H49 M39 18 H50"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function normalizeUrl(input) {
  if (!input) return "";
  const trimmed = String(input).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isAmazonProductUrl(urlString) {
  try {
    const u = new URL(urlString);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();

    // Accept common Amazon retail domains (global) but block obvious non-Amazon
    const amazonHost =
      host === "amazon.com" ||
      host.endsWith(".amazon.com") ||
      host.startsWith("amazon.") ||
      host.includes("amazon.");

    if (!amazonHost) return false;

    // Heuristic: product pages often contain /dp/ or /gp/product/ or /gp/aw/d/
    const path = u.pathname.toLowerCase();
    const looksLikeProduct =
      path.includes("/dp/") ||
      path.includes("/gp/product/") ||
      path.includes("/gp/aw/d/");

    // If they paste a search page or storefront, we still allow, but we warn by returning true.
    // Keep it strict enough to prevent random domains, but not so strict it rejects valid variants.
    return looksLikeProduct || true;
  } catch {
    return false;
  }
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
  const year = useMemo(() => new Date().getFullYear(), []);
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
      setError("Please paste a valid Amazon product link.");
      return;
    }
    if (!isAmazonProductUrl(normalizedUrl)) {
      setError("For now, Alitrite only supports Amazon product links.");
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
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.topNav}>
        <a href="/" style={styles.navHome} aria-label="Back to Home">
          ← Home
        </a>

        <a href="/" style={styles.navBrandWrap} aria-label="Alitrite Home">
          <span style={styles.navLogo}>
            <LogoMark size={20} />
          </span>
          <div style={styles.navBrand}>Alitrite</div>
        </a>

        <a href="/privacy" style={styles.navPrivacy}>
          Privacy
        </a>
      </header>

      <div style={styles.card}>
        {!result && !screenshot && (
          <div style={styles.instructions}>
            <h1 style={styles.heroTitle}>Paste an Amazon product link.</h1>
            <p style={styles.heroSubtitle}>
              We analyze listing, seller context, and pricing signals and return
              a simple rating — <strong>free</strong>.
            </p>

            <div style={styles.steps}>
              <div style={styles.step}>
                <strong>1.</strong> Open the Amazon product page
              </div>
              <div style={styles.step}>
                <strong>2.</strong> Copy the <strong>full URL</strong> from the
                address bar
              </div>
              <div style={styles.step}>
                <strong>3.</strong> Paste it below and press{" "}
                <strong>Analyze</strong>
              </div>
            </div>

            <div style={styles.trustNote}>
              <strong>Note:</strong> Not affiliated with Amazon. AI can make
              mistakes—verify critical details before purchasing.
            </div>
          </div>
        )}

        {!result && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label} htmlFor="amazonUrl">
              Amazon product URL
            </label>
            <input
              id="amazonUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.amazon.com/dp/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Product"}
            </button>
            <p style={styles.helperText}>
              Tip: copy the URL from the product page (address bar) and paste it
              here.
            </p>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {screenshot && (
          <div style={{ margin: "24px 0", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 10px" }}>Product Screenshot</h4>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Product screenshot"
              style={{
                maxWidth: "100%",
                borderRadius: 12,
                boxShadow: "0 10px 26px rgba(15,23,42,0.14)",
                border: "1px solid #e2e8f0",
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
              <h3 style={{ margin: 0 }}>
                {result.title || "Product Title Not Detected"}
              </h3>
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Website Trust</h4>
              <Stars score={result.websiteTrust?.score} />
              <p style={styles.sectionText}>{result.websiteTrust?.reason}</p>
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Seller Trust</h4>
              <Stars score={result.sellerTrust?.score} />
              <p style={styles.sectionText}>{result.sellerTrust?.reason}</p>
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Product Trust</h4>
              <Stars score={result.productTrust?.score} />
              <p style={styles.sectionText}>{result.productTrust?.reason}</p>
            </div>

            <div style={styles.overall}>
              <h3 style={{ marginTop: 0 }}>Overall Rating</h3>
              <Stars score={result.overall?.score} />
              <p style={{ marginTop: 10 }}>
                <strong>{result.overall?.meaning}</strong>
              </p>
              <p style={styles.sectionText}>{result.overall?.reason}</p>

              <div style={styles.disclaimerBox}>
                AI can make mistakes. Use this as guidance, not a guarantee.
                Always verify critical details before purchasing.
              </div>

              <div style={styles.actionsRow}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => {
                    setUrl("");
                    setResult(null);
                    setScreenshot(null);
                    setError("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Check another link
                </button>
                <a href="/" style={styles.secondaryLink}>
                  Back to Home →
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>{year} © Alitrite</div>
          <div style={styles.footerRight}>
            <a href="/privacy" style={styles.footerLink}>
              Privacy Policy
            </a>
            <a href="/" style={styles.footerLink}>
              Home
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#f6f8fc",
    padding: 20,
    gap: 16,
  },

  topNav: {
    width: "100%",
    maxWidth: 760,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "10px 4px",
  },
  navHome: {
    justifySelf: "start",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 800,
  },
  navBrandWrap: {
    justifySelf: "center",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "#0f172a",
  },
  navLogo: {
    width: 20,
    height: 20,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navBrand: {
    fontWeight: 950,
    letterSpacing: 0.2,
    color: "#0f172a",
  },
  navPrivacy: {
    justifySelf: "end",
    color: "#334155",
    textDecoration: "none",
    fontWeight: 800,
  },

  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 760,
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
  },

  instructions: { marginBottom: 24, textAlign: "center" },
  heroTitle: {
    fontSize: 30,
    fontWeight: 950,
    marginBottom: 10,
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 18,
    lineHeight: 1.7,
  },

  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textAlign: "left",
    fontSize: 14,
    maxWidth: 560,
    margin: "0 auto",
  },
  step: {
    background: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  trustNote: {
    marginTop: 14,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.7,
    maxWidth: 560,
    marginLeft: "auto",
    marginRight: "auto",
  },

  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 10 },
  label: { fontSize: 13, fontWeight: 900, color: "#0f172a" },
  input: {
    padding: 14,
    fontSize: 16,
    borderRadius: 12,
    border: "1px solid #dbeafe",
    outline: "none",
  },
  button: {
    padding: 14,
    fontSize: 16,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 900,
  },
  helperText: { fontSize: 12, color: "#64748b", textAlign: "center" },
  error: {
    color: "#dc2626",
    marginTop: 14,
    textAlign: "center",
    fontWeight: 900,
  },

  verdict: (status) => ({
    fontSize: 30,
    fontWeight: 950,
    color: OVERALL_COLORS[status] || "#111",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.4,
  }),

  section: { marginBottom: 18 },
  sectionTitle: { margin: "0 0 6px", color: "#0f172a" },
  sectionText: { marginTop: 8, color: "#475569", lineHeight: 1.7, fontSize: 13 },

  overall: {
    marginTop: 14,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 16,
  },
  disclaimerBox: {
    marginTop: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.7,
  },
  actionsRow: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0f172a",
  },
  secondaryLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 900,
  },

  footer: { width: "100%", maxWidth: 760, marginTop: 6, paddingBottom: 10 },
  footerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 12,
    padding: "0 4px",
  },
  footerLeft: { fontWeight: 800 },
  footerRight: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: { color: "#64748b", textDecoration: "none", fontWeight: 800 },
};
