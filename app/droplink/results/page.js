// app/droplink/results/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function MeterBar({ label, score, left = "Low", right = "High" }) {
  const v =
    typeof score === "number" && Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : 0;

  return (
    <div style={styles.meterWrap} aria-label={`${label} score ${v} out of 100`}>
      <div style={styles.meterTop}>
        <span style={styles.meterLabel}>{label}</span>
        <span style={styles.meterNum}>{v}/100</span>
      </div>
      <div style={styles.meterTrack}>
        <div style={{ ...styles.meterFill, width: `${v}%` }} />
      </div>
      <div style={styles.meterEnds}>
        <span style={styles.meterEndText}>{left}</span>
        <span style={styles.meterEndText}>{right}</span>
      </div>
    </div>
  );
}

function ExternalCardLink({ href, children, style }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      style={{ ...styles.cardLink, ...style }}
    >
      {children}
    </a>
  );
}

export default function DropLinkResultsPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const linkBottomRef = useRef(null);

  const [result, setResult] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("droplink:lastResult");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setSourceUrl(parsed?.url || null);
      setScreenshot(parsed?.screenshot || null);
      setResult(parsed?.result || null);
    } catch {
      // ignore
    }
  }, []);

  function jumpToBottomLink() {
    const el = linkBottomRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function analyzeAnother() {
    try {
      sessionStorage.removeItem("droplink:lastResult");
    } catch {
      // ignore
    }
    window.location.href = "/droplink";
  }

  const hasResults = !!result;
  const primary = result?.links?.primary || (sourceUrl ? { href: sourceUrl } : null);

  const suggested = Array.isArray(result?.links?.suggested) ? result.links.suggested : [];
  const showSuggested = hasResults && result?.status !== "good product" && suggested.length > 0;

  return (
    <div style={styles.container}>
      <header style={styles.topNav}>
        <a href="/droplink" style={styles.navHome} aria-label="Back to analyzer">
          ← Analyze
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
        {!hasResults && !screenshot && (
          <div style={styles.emptyState}>
            <h1 style={styles.heroTitle}>No results loaded.</h1>
            <p style={styles.heroSubtitle}>
              Go back and analyze a product first (results are stored temporarily in this browser tab).
            </p>
            <a href="/droplink" style={styles.primaryLinkBtn}>
              Go to analyzer →
            </a>
          </div>
        )}

        {hasResults && (
          <>
            <div style={styles.verdict(result.status)}>
              {OVERALL_LABELS[result.status] || "UNRATED"}
            </div>

            <div style={styles.titleRow}>
              <h3 style={{ margin: 0 }}>{result.title || "Product Title Not Detected"}</h3>

              <div style={styles.titleRowRight}>
                <button
                  type="button"
                  onClick={jumpToBottomLink}
                  style={styles.jumpButton}
                  aria-label="Jump to product link"
                >
                  Jump to link ↓
                </button>
                <button
                  type="button"
                  onClick={analyzeAnother}
                  style={styles.secondaryButton}
                  aria-label="Analyze another product"
                >
                  Analyze another
                </button>
              </div>
            </div>

            {screenshot && (
              <div style={{ margin: "18px 0 0", textAlign: "center" }}>
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

            {/* DETAILS */}
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
                AI can make mistakes. Use this as guidance, not a guarantee. Always verify critical
                details before purchasing.
              </div>
            </div>

            {/* LINKS — at the BOTTOM (always includes original product link) */}
            <div ref={linkBottomRef} style={styles.linksWrap}>
              <div style={styles.linksHeader}>
                <h3 style={{ margin: 0 }}>Next step: open links</h3>
                <div style={styles.linksSub}>
                  The original product link is always shown below, even if the rating is negative.
                </div>
              </div>

              {/* ORIGINAL PRODUCT CTA (always) */}
              {primary?.href && (
                <ExternalCardLink href={primary.href} style={styles.primaryCard}>
                  <div style={styles.primaryCardTop}>
                    <div style={styles.primaryEyebrow}>Original product link</div>
                    <div style={styles.primaryCtaText}>
                      {result.status === "good product"
                        ? "Go back to your product →"
                        : "Open the original product on Amazon →"}
                    </div>
                    <div style={styles.primarySub}>Opens Amazon in a new tab.</div>
                  </div>
                </ExternalCardLink>
              )}

              {/* SUGGESTED (ONLY if not good product) — still below original link */}
              {showSuggested && (
                <div style={styles.suggestedWrap}>
                  <div style={styles.suggestedHeader}>
                    <h3 style={{ margin: 0 }}>
                      {result?.links?.suggestedLabel || "Your best-value options"}
                    </h3>
                    <div style={styles.suggestedSub}>
                      {result?.links?.suggestedNote ||
                        "Three alternatives across a low, mid, and high price range — optimized for value."}
                    </div>
                  </div>

                  <div style={styles.suggestedGrid}>
                    {suggested.slice(0, 3).map((item, idx) => (
                      <ExternalCardLink key={idx} href={item?.link} style={styles.suggestedCard}>
                        <div style={styles.suggestedTop}>
                          <div style={styles.badge}>{item?.badge || "VALUE"}</div>
                          <div style={styles.tier}>{item?.label || item?.tier}</div>
                        </div>

                        <div style={styles.suggestedTitle}>
                          {item?.title || "Recommended option"}
                        </div>

                        {item?.displayPrice ? (
                          <div style={styles.priceRow}>
                            <span style={styles.price}>{item.displayPrice}</span>
                          </div>
                        ) : (
                          <div style={styles.priceRow}>
                            <span style={styles.priceMuted}>Price shown on Amazon</span>
                          </div>
                        )}

                        <MeterBar label="Value" score={item?.valueScore} left="Poor" right="Great" />
                        <MeterBar
                          label="Quality"
                          score={item?.qualityScore}
                          left="Basic"
                          right="Premium"
                        />

                        <div style={styles.tagline}>
                          {item?.tagline ||
                            "Strong value for the price. Click to see the current deal on Amazon."}
                        </div>

                        <div style={styles.openLine}>Open on Amazon →</div>
                      </ExternalCardLink>
                    ))}
                  </div>

                  <div style={styles.equivalencyNote}>
                    These options are meant to be equivalent choices by{" "}
                    <strong>value-for-price</strong>. Higher-priced picks usually include more
                    features or stronger performance, but all three aim to be “worth it” for their
                    tier.
                  </div>
                </div>
              )}
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

  emptyState: { textAlign: "center" },
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
    maxWidth: 560,
    marginLeft: "auto",
    marginRight: "auto",
  },
  primaryLinkBtn: {
    display: "inline-block",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 900,
    textDecoration: "none",
  },

  verdict: (status) => ({
    fontSize: 30,
    fontWeight: 950,
    color: OVERALL_COLORS[status] || "#111",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 0.4,
  }),

  titleRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  titleRowRight: {
    display: "inline-flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  jumpButton: {
    fontSize: 12,
    fontWeight: 950,
    color: "#0f172a",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  secondaryButton: {
    fontSize: 12,
    fontWeight: 950,
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  section: { marginTop: 18 },
  sectionTitle: { margin: "0 0 6px", color: "#0f172a" },
  sectionText: { marginTop: 8, color: "#475569", lineHeight: 1.7, fontSize: 13 },

  overall: {
    marginTop: 18,
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

  cardLink: {
    display: "block",
    textDecoration: "none",
    color: "inherit",
  },

  linksWrap: {
    marginTop: 24,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 18,
  },
  linksHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  linksSub: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    maxWidth: 420,
    lineHeight: 1.5,
  },

  primaryCard: {
    marginTop: 8,
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 70%)",
    boxShadow: "0 18px 40px rgba(37,99,235,0.12)",
    overflow: "hidden",
  },
  primaryCardTop: { padding: 16 },
  primaryEyebrow: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 950,
    color: "#1d4ed8",
    background: "#dbeafe",
    padding: "6px 10px",
    borderRadius: 999,
  },
  primaryCtaText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 950,
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  primarySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
  },

  suggestedWrap: {
    marginTop: 18,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 18,
  },
  suggestedHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  suggestedSub: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    maxWidth: 420,
    lineHeight: 1.5,
  },
  suggestedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  suggestedCard: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  },
  suggestedTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 950,
    color: "#0f172a",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "6px 8px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  tier: { fontSize: 12, fontWeight: 950, color: "#0f172a" },
  suggestedTitle: {
    fontSize: 13,
    fontWeight: 950,
    color: "#0f172a",
    lineHeight: 1.4,
    minHeight: 38,
  },

  priceRow: { marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 },
  price: { fontWeight: 950, color: "#0f172a" },
  priceMuted: { fontWeight: 900, color: "#64748b", fontSize: 12 },

  meterWrap: { marginTop: 10 },
  meterTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  meterLabel: { fontSize: 12, fontWeight: 900, color: "#334155" },
  meterNum: { fontSize: 12, fontWeight: 950, color: "#0f172a" },
  meterTrack: {
    height: 10,
    borderRadius: 999,
    background: "#eef2ff",
    border: "1px solid #dbeafe",
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
    background: "#2563eb",
  },
  meterEnds: {
    marginTop: 6,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 800,
  },
  meterEndText: { lineHeight: 1.2 },

  tagline: {
    marginTop: 10,
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.6,
  },
  openLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 950,
    color: "#2563eb",
  },

  equivalencyNote: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.6,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 12,
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
