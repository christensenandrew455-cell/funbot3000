// app/page.js
"use client";

import { useMemo, useState } from "react";

export default function HomePage() {
  const [email, setEmail] = useState("");

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.brand}>Alitrite</div>

          <nav style={s.nav}>
            <a style={s.navLink} href="#how">How it works</a>
            <a style={s.navLink} href="#ratings">Ratings</a>
            <a style={s.navLink} href="#privacy">Privacy</a>
            <a style={s.navLink} href="#faq">FAQ</a>
            <a style={{ ...s.navLink, ...s.navCTA }} href="/droplink">
              Drop a link →
            </a>
          </nav>
        </div>
      </header>

      <main style={s.main}>
        {/* HERO */}
        <section style={s.hero}>
          <div style={s.heroGrid}>
            <div>
              <h1 style={s.h1}>
                Know if an Amazon product is legit <span style={s.h1Accent}>before</span> you buy.
              </h1>

              <p style={s.lead}>
                Alitrite is a free, AI-assisted product checker. Paste an Amazon product link and
                get a clear rating based on signals from the listing, seller context, and value
                indicators — designed to help you avoid scams, sketchy listings, and bad deals.
              </p>

              <div style={s.ctaRow}>
                <a href="/droplink" style={s.primaryBtn}>
                  Drop a link (free) →
                </a>
                <a href="#how" style={s.secondaryBtn}>
                  See how it works
                </a>
              </div>

              <div style={s.trustRow}>
                <div style={s.trustPill}>Free to use</div>
                <div style={s.trustPill}>Unlimited checks</div>
                <div style={s.trustPill}>Amazon products only (for now)</div>
              </div>

              <p style={s.micro}>
                AI can make mistakes. Alitrite provides guidance, not guarantees. Always verify
                critical details before purchasing.
              </p>
            </div>

            {/* RIGHT CARD */}
            <div style={s.heroCard}>
              <div style={s.cardTop}>
                <div style={s.cardBadge}>Live rating levels</div>
                <div style={s.cardTitle}>Simple, readable outcomes</div>
                <div style={s.cardSub}>
                  Not a wall of jargon. You get a label + reasoning that’s easy to act on.
                </div>
              </div>

              <div style={s.levelList}>
                <div style={s.levelItem}>
                  <span style={{ ...s.dot, background: "#dc2626" }} />
                  <div>
                    <div style={s.levelName}>Scam</div>
                    <div style={s.levelDesc}>High-risk signals. Avoid.</div>
                  </div>
                </div>
                <div style={s.levelItem}>
                  <span style={{ ...s.dot, background: "#ea580c" }} />
                  <div>
                    <div style={s.levelName}>Untrustworthy</div>
                    <div style={s.levelDesc}>Too many red flags.</div>
                  </div>
                </div>
                <div style={s.levelItem}>
                  <span style={{ ...s.dot, background: "#d97706" }} />
                  <div>
                    <div style={s.levelName}>Overpriced / Bad value</div>
                    <div style={s.levelDesc}>Looks real, but not worth the price.</div>
                  </div>
                </div>
                <div style={s.levelItem}>
                  <span style={{ ...s.dot, background: "#16a34a" }} />
                  <div>
                    <div style={s.levelName}>Good product</div>
                    <div style={s.levelDesc}>Strong signals + reasonable value.</div>
                  </div>
                </div>
              </div>

              <a href="/droplink" style={s.cardCTA}>
                Paste a link now →
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={s.section}>
          <h2 style={s.h2}>How Alitrite works</h2>
          <p style={s.p}>
            You paste an Amazon product link. Alitrite analyzes the product listing context and
            returns a rating that’s easy to understand. The goal is simple: reduce the chance you
            waste money on scams, low-quality junk, or wildly overpriced listings.
          </p>

          <div style={s.grid3}>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>1) Drop the link</div>
              <div style={s.featureText}>
                Copy the full Amazon product URL and paste it into the DropLink page.
              </div>
            </div>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>2) AI-assisted analysis</div>
              <div style={s.featureText}>
                The system evaluates signals around the listing, seller context, and value
                indicators to estimate risk.
              </div>
            </div>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>3) Get a clear outcome</div>
              <div style={s.featureText}>
                You get one of four levels (Scam, Untrustworthy, Overpriced/Bad Value, Good
                Product) plus reasoning you can skim fast.
              </div>
            </div>
          </div>

          <div style={s.notice}>
            <strong>Important:</strong> Alitrite currently supports <strong>Amazon product links</strong>.
            Other marketplaces are not guaranteed to work yet.
          </div>
        </section>

        {/* RATINGS */}
        <section id="ratings" style={s.section}>
          <h2 style={s.h2}>The rating system</h2>
          <p style={s.p}>
            Alitrite outputs one simple level so you can decide quickly:
          </p>

          <div style={s.grid2}>
            <div style={s.ratingCard}>
              <div style={{ ...s.ratingTag, background: "#fee2e2", color: "#991b1b" }}>SCAM</div>
              <div style={s.ratingText}>
                Strong risk signals. If you’re unsure, do not purchase.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div style={{ ...s.ratingTag, background: "#ffedd5", color: "#9a3412" }}>
                UNTRUSTWORTHY
              </div>
              <div style={s.ratingText}>
                Too many issues in seller/listing signals. High caution recommended.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div style={{ ...s.ratingTag, background: "#fef3c7", color: "#92400e" }}>
                OVERPRICED / BAD VALUE
              </div>
              <div style={s.ratingText}>
                It may be real, but the price/value looks off. Consider alternatives.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div style={{ ...s.ratingTag, background: "#dcfce7", color: "#166534" }}>
                GOOD PRODUCT
              </div>
              <div style={s.ratingText}>
                Stronger signals and better value indicators. Still verify important details.
              </div>
            </div>
          </div>

          <div style={s.ctaStrip}>
            <div style={s.ctaStripText}>
              Don’t guess. Paste the link and get a readable verdict in seconds.
            </div>
            <a href="/droplink" style={s.ctaStripBtn}>
              Drop a link →
            </a>
          </div>
        </section>

        {/* PRIVACY */}
        <section id="privacy" style={s.section}>
          <h2 style={s.h2}>Privacy & data</h2>
          <p style={s.p}>
            Alitrite is built to be simple and privacy-minded. We don’t ask you to create an
            account just to run checks, and we don’t need your personal info to analyze a product
            link.
          </p>

          <div style={s.grid2}>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>No account required</div>
              <div style={s.featureText}>
                Use it immediately. Paste link → analyze → get results.
              </div>
            </div>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>No selling user data</div>
              <div style={s.featureText}>
                We’re not in the business of selling personal information. The product check works
                without you handing over your identity.
              </div>
            </div>
          </div>

          <div style={s.notice}>
            <strong>Transparency note:</strong> If you later add analytics/ads/affiliate tracking,
            update your Privacy Policy to match reality. Don’t overpromise.
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={s.section}>
          <h2 style={s.h2}>FAQ</h2>

          <details style={s.faq}>
            <summary style={s.faqQ}>Is Alitrite free?</summary>
            <div style={s.faqA}>
              Yes. It’s designed to be free to use and you can run checks as many times as you want.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>What links work?</summary>
            <div style={s.faqA}>
              Right now, Alitrite is built for Amazon product pages. Other marketplaces are not guaranteed.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>Is the rating always correct?</summary>
            <div style={s.faqA}>
              No system is perfect. AI can make mistakes. Use the result as guidance and always double-check
              critical info before buying (especially for high-cost purchases).
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>What do the levels mean?</summary>
            <div style={s.faqA}>
              Alitrite returns one of four outcomes: Scam, Untrustworthy, Overpriced/Bad Value, or Good Product —
              plus a short explanation so you understand why.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>Do you collect my personal information?</summary>
            <div style={s.faqA}>
              The basic flow does not require your personal info. If you add features later (accounts, saving history,
              email alerts), publish a clear privacy policy explaining what’s collected and why.
            </div>
          </details>
        </section>

        {/* OPTIONAL EMAIL CTA (you can remove) */}
        <section style={s.section}>
          <div style={s.finalCard}>
            <h3 style={s.h3}>Ready to check a product?</h3>
            <p style={s.p}>
              Paste an Amazon product link and get a clear verdict — fast, free, and easy to understand.
            </p>

            <div style={s.ctaRow}>
              <a href="/droplink" style={s.primaryBtn}>Drop a link →</a>
              <div style={s.emailBox}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional: your email (future updates)"
                  style={s.emailInput}
                />
                <button
                  type="button"
                  onClick={() => alert("Optional field only. Hook this up later if you want.")}
                  style={s.emailBtn}
                >
                  Notify me
                </button>
              </div>
            </div>

            <div style={s.micro}>
              {year} © Alitrite. AI-assisted guidance only — verify critical details.
            </div>
          </div>
        </section>
      </main>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLeft}>Alitrite</div>
          <div style={s.footerRight}>
            <a style={s.footerLink} href="/droplink">DropLink</a>
            <a style={s.footerLink} href="#privacy">Privacy</a>
            <a style={s.footerLink} href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fc",
    color: "#0f172a",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(246,248,252,0.9)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e2e8f0",
  },
  headerInner: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: { fontWeight: 900, letterSpacing: 0.2, fontSize: 18 },
  nav: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navLink: {
    textDecoration: "none",
    color: "#334155",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
  },
  navCTA: {
    background: "#2563eb",
    color: "#fff",
  },
  main: { maxWidth: 1040, margin: "0 auto", padding: "22px 16px 64px" },

  hero: { padding: "26px 0 10px" },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.9fr",
    gap: 18,
    alignItems: "start",
  },
  h1: { fontSize: 44, lineHeight: 1.05, margin: 0, fontWeight: 950, letterSpacing: -0.6 },
  h1Accent: { color: "#2563eb" },
  lead: { marginTop: 14, fontSize: 16, lineHeight: 1.7, color: "#475569" },
  ctaRow: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" },
  primaryBtn: {
    display: "inline-block",
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
  },
  secondaryBtn: {
    display: "inline-block",
    background: "#ffffff",
    color: "#0f172a",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
    border: "1px solid #e2e8f0",
  },
  trustRow: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  trustPill: {
    fontSize: 12,
    fontWeight: 800,
    color: "#0f172a",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "8px 10px",
    borderRadius: 999,
  },
  micro: { fontSize: 12, color: "#64748b", marginTop: 12, lineHeight: 1.6 },

  heroCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },
  cardTop: { padding: 16, borderBottom: "1px solid #e2e8f0" },
  cardBadge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: 999,
  },
  cardTitle: { marginTop: 10, fontSize: 18, fontWeight: 950 },
  cardSub: { marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.6 },
  levelList: { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  levelItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 6 },
  levelName: { fontWeight: 900, fontSize: 13 },
  levelDesc: { fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.5 },
  cardCTA: {
    display: "block",
    textAlign: "center",
    padding: "14px 16px",
    fontWeight: 950,
    textDecoration: "none",
    color: "#2563eb",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  section: { marginTop: 40 },
  h2: { fontSize: 28, fontWeight: 950, margin: "0 0 10px" },
  h3: { fontSize: 20, fontWeight: 950, margin: "0 0 8px" },
  p: { fontSize: 15, lineHeight: 1.8, color: "#475569", margin: "10px 0 0" },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 14,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 14,
  },
  featureCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
  },
  featureTitle: { fontWeight: 950, marginBottom: 6 },
  featureText: { fontSize: 13, lineHeight: 1.7, color: "#64748b" },

  notice: {
    marginTop: 14,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    lineHeight: 1.7,
    color: "#334155",
    fontSize: 13,
  },

  ratingCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
  },
  ratingTag: {
    display: "inline-block",
    fontWeight: 950,
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
  },
  ratingText: { marginTop: 8, fontSize: 13, color: "#64748b", lineHeight: 1.7 },

  ctaStrip: {
    marginTop: 16,
    background: "#0f172a",
    color: "#fff",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  ctaStripText: { fontWeight: 900 },
  ctaStripBtn: {
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 950,
  },

  faq: {
    marginTop: 10,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 12,
  },
  faqQ: { cursor: "pointer", fontWeight: 950 },
  faqA: { marginTop: 10, color: "#475569", lineHeight: 1.7, fontSize: 13 },

  finalCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
  },
  emailBox: { display: "flex", gap: 10, flexWrap: "wrap" },
  emailInput: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    minWidth: 240,
    flex: 1,
  },
  emailBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: { borderTop: "1px solid #e2e8f0", background: "#f6f8fc" },
  footerInner: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "16px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  footerLeft: { fontWeight: 900 },
  footerRight: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: { color: "#334155", textDecoration: "none", fontWeight: 800, fontSize: 13 },
};

/**
 * NOTE on responsiveness:
 * Inline styles can't use media queries. This layout is still fairly responsive because:
 * - grids use fixed columns; on very small screens you may want a CSS file or Tailwind.
 * If you want, I’ll convert this to Tailwind so it snaps to 1-column on mobile perfectly.
 */
