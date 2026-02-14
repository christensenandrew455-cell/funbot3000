// app/page.js
"use client";

import { useMemo } from "react";

function LogoMark({ size = 22 }) {
  // Simple “A + magnifying glass” mark that reads well small (header + future favicon reference)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Alitrite"
      style={{ display: "block" }}
    >
      {/* A */}
      <path
        d="M30 10 L12 54 H20 L24 44 H40 L44 54 H52 L34 10 Z M27 36 L32 22 L37 36 Z"
        fill="#2563eb"
      />
      {/* Magnifying glass */}
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
      {/* “Text lines” inside lens */}
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

export default function HomePage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.brandWrap}>
            <span style={s.logo}>
              <LogoMark size={22} />
            </span>
            <div style={s.brand}>Alitrite</div>
          </div>

          <nav style={s.nav}>
            <a style={s.navLink} href="#how">
              How it works
            </a>
            <a style={s.navLink} href="#ratings">
              Ratings
            </a>
            {/* Privacy in header should jump to the privacy section on THIS page */}
            <a style={s.navLink} href="#privacy">
              Privacy
            </a>
            <a style={s.navLink} href="#faq">
              FAQ
            </a>

            {/* Header CTA label should be the site name (still links to the tool page) */}
            <a style={{ ...s.navLink, ...s.navCTA }} href="/droplink">
              Alitrite →
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
                Know if an Amazon product is legit{" "}
                <span style={s.h1Accent}>before</span> you buy.
              </h1>

              <p style={s.lead}>
                Alitrite is a free, AI-assisted product checker. Paste an Amazon
                product link and get a clear rating based on signals from the
                listing, seller context, and value indicators — designed to help
                you avoid scams, sketchy listings, and bad deals.
              </p>

              <div style={s.ctaRow}>
                <a href="/droplink" style={s.primaryBtn}>
                  Check a product (free) →
                </a>
                <a href="#how" style={s.secondaryBtn}>
                  How it works
                </a>
              </div>

              <div style={s.trustRow}>
                <div style={s.trustPill}>Free</div>
                <div style={s.trustPill}>Unlimited checks</div>
                <div style={s.trustPill}>Amazon links only (for now)</div>
              </div>

              <p style={s.micro}>
                AI can make mistakes. Alitrite provides guidance, not guarantees.
                Always verify critical details before purchasing.
              </p>
            </div>

            {/* RIGHT CARD */}
            <div style={s.heroCard}>
              <div style={s.cardTop}>
                <div style={s.cardBadge}>Rating levels</div>
                <div style={s.cardTitle}>Simple, readable outcomes</div>
                <div style={s.cardSub}>
                  You get a label + short reasoning that’s easy to act on.
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
                    <div style={s.levelName}>Bad value</div>
                    <div style={s.levelDesc}>Looks real, but not worth it.</div>
                  </div>
                </div>
                <div style={s.levelItem}>
                  <span style={{ ...s.dot, background: "#16a34a" }} />
                  <div>
                    <div style={s.levelName}>Good product</div>
                    <div style={s.levelDesc}>
                      Strong signals + reasonable value.
                    </div>
                  </div>
                </div>
              </div>

              <a href="/droplink" style={s.cardCTA}>
                Run a check →
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={s.section}>
          <h2 style={s.h2}>How Alitrite works</h2>
          <p style={s.p}>
            You paste an Amazon product link. Alitrite analyzes the product
            listing context and returns a rating that’s easy to understand. The
            goal is simple: reduce the chance you waste money on scams,
            low-quality junk, or bad deals.
          </p>

          <div style={s.grid3}>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>1) Paste the link</div>
              <div style={s.featureText}>
                Copy the full Amazon product URL and paste it into the DropLink
                page.
              </div>
            </div>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>2) AI-assisted analysis</div>
              <div style={s.featureText}>
                The system evaluates signals around the listing, seller context,
                and value indicators to estimate risk.
              </div>
            </div>
            <div style={s.featureCard}>
              <div style={s.featureTitle}>3) Get a clear outcome</div>
              <div style={s.featureText}>
                You get one of four levels (Scam, Untrustworthy, Bad Value, Good
                Product) plus reasoning you can skim fast.
              </div>
            </div>
          </div>

          <div style={s.notice}>
            <strong>Note:</strong> Alitrite currently supports{" "}
            <strong>Amazon product links</strong>. Other marketplaces are not
            guaranteed to work yet.
          </div>
        </section>

        {/* RATINGS */}
        <section id="ratings" style={s.section}>
          <h2 style={s.h2}>The rating system</h2>
          <p style={s.p}>Alitrite outputs one simple level:</p>

          <div style={s.grid2}>
            <div style={s.ratingCard}>
              <div
                style={{
                  ...s.ratingTag,
                  background: "#fee2e2",
                  color: "#991b1b",
                }}
              >
                SCAM
              </div>
              <div style={s.ratingText}>
                Strong risk signals. If you’re unsure, do not purchase.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div
                style={{
                  ...s.ratingTag,
                  background: "#ffedd5",
                  color: "#9a3412",
                }}
              >
                UNTRUSTWORTHY
              </div>
              <div style={s.ratingText}>
                Too many issues in seller/listing signals. High caution
                recommended.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div
                style={{
                  ...s.ratingTag,
                  background: "#fef3c7",
                  color: "#92400e",
                }}
              >
                BAD VALUE
              </div>
              <div style={s.ratingText}>
                It may be real, but the price/value looks off. Consider
                alternatives.
              </div>
            </div>

            <div style={s.ratingCard}>
              <div
                style={{
                  ...s.ratingTag,
                  background: "#dcfce7",
                  color: "#166534",
                }}
              >
                GOOD PRODUCT
              </div>
              <div style={s.ratingText}>
                Stronger signals and better value indicators. Still verify
                important details.
              </div>
            </div>
          </div>

          <div style={s.ctaStrip}>
            <div style={s.ctaStripText}>
              Don’t guess. Paste the link and get a readable verdict in seconds.
            </div>
            <a href="/droplink" style={s.ctaStripBtn}>
              Check a product →
            </a>
          </div>
        </section>

        {/* PRIVACY (short summary + learn more) */}
        <section id="privacy" style={s.section}>
          <h2 style={s.h2}>Privacy</h2>
          <p style={s.p}>
            No account required to run checks. We don’t need your personal info
            to analyze a product link. If we use affiliate links (like Amazon),
            Amazon may use cookies to track purchases for commission attribution.
          </p>

          <div style={s.privacyRow}>
            <a href="/privacy" style={s.privacyBtn}>
              Read the full Privacy Policy →
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={s.section}>
          <h2 style={s.h2}>FAQ</h2>

          <details style={s.faq}>
            <summary style={s.faqQ}>Is Alitrite free?</summary>
            <div style={s.faqA}>
              Yes. It’s designed to be free to use and you can run checks as
              many times as you want.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>What links work?</summary>
            <div style={s.faqA}>
              Right now, Alitrite is built for Amazon product pages. Other
              marketplaces are not guaranteed.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>Is the rating always correct?</summary>
            <div style={s.faqA}>
              No system is perfect. AI can make mistakes. Use the result as
              guidance and always double-check critical info before buying
              (especially for high-cost purchases).
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>What do the levels mean?</summary>
            <div style={s.faqA}>
              Alitrite returns one of four outcomes: Scam, Untrustworthy, Bad
              Value, or Good Product — plus a short explanation so you
              understand why.
            </div>
          </details>

          <details style={s.faq}>
            <summary style={s.faqQ}>Do you collect my personal information?</summary>
            <div style={s.faqA}>
              The basic flow does not require your personal info. For details,
              see the full Privacy Policy.
            </div>
          </details>

          <div style={s.bottomCTA}>
            <div style={s.bottomCTAText}>Ready?</div>
            <a href="/droplink" style={s.primaryBtn}>
              Check a product →
            </a>
          </div>
        </section>
      </main>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLeft}>
            {year} © Alitrite
            <div style={s.footerMicro}>
              AI-assisted guidance only — verify critical details.
            </div>
          </div>
          <div style={s.footerRight}>
            <a style={s.footerLink} href="/droplink">
              DropLink
            </a>
            <a style={s.footerLink} href="#privacy">
              Privacy
            </a>
            <a style={s.footerLink} href="/privacy">
              Privacy Policy
            </a>
            <a style={s.footerLink} href="#faq">
              FAQ
            </a>
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
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 140,
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontWeight: 900, letterSpacing: 0.2, fontSize: 18 },

  nav: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navLink: {
    textDecoration: "none",
    color: "#334155",
    fontWeight: 800,
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
  h1: {
    fontSize: 44,
    lineHeight: 1.05,
    margin: 0,
    fontWeight: 950,
    letterSpacing: -0.6,
  },
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
    fontWeight: 950,
  },
  secondaryBtn: {
    display: "inline-block",
    background: "#ffffff",
    color: "#0f172a",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 950,
    border: "1px solid #e2e8f0",
  },

  trustRow: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  trustPill: {
    fontSize: 12,
    fontWeight: 850,
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
    fontWeight: 950,
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
  levelName: { fontWeight: 950, fontSize: 13 },
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
  ctaStripText: { fontWeight: 950 },
  ctaStripBtn: {
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 950,
  },

  privacyRow: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" },
  privacyBtn: {
    display: "inline-block",
    background: "#ffffff",
    color: "#0f172a",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 950,
    border: "1px solid #e2e8f0",
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

  bottomCTA: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
  },
  bottomCTAText: { fontWeight: 950, color: "#0f172a" },

  footer: { borderTop: "1px solid #e2e8f0", background: "#f6f8fc" },
  footerInner: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "16px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  footerLeft: { fontWeight: 950, lineHeight: 1.3 },
  footerMicro: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
  },
  footerRight: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: {
    color: "#334155",
    textDecoration: "none",
    fontWeight: 850,
    fontSize: 13,
  },
};
