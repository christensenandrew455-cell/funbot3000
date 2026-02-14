// app/privacy/page.js
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export default function PrivacyPolicy() {
  const router = useRouter();

  const effectiveDate = "February 14, 2026";
  const year = useMemo(() => new Date().getFullYear(), []);

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "40px 20px",
      background: "linear-gradient(to right, #f0f4ff, #ffffff)",
      fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    },
    card: {
      background: "white",
      padding: 32,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      maxWidth: 820,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      border: "1px solid #e2e8f0",
    },
    title: {
      fontSize: 32,
      fontWeight: 900,
      marginBottom: 10,
      textAlign: "center",
      letterSpacing: -0.4,
      color: "#0f172a",
    },
    subTitle: {
      textAlign: "center",
      color: "#64748b",
      fontSize: 14,
      marginBottom: 18,
      lineHeight: 1.6,
    },
    meta: {
      fontSize: 14,
      color: "#334155",
      marginBottom: 14,
      textAlign: "center",
    },
    badge: {
      display: "inline-block",
      alignSelf: "center",
      background: "#eff6ff",
      color: "#1d4ed8",
      fontWeight: 900,
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      marginBottom: 18,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 900,
      marginTop: 18,
      marginBottom: 10,
      color: "#0f172a",
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 1.8,
      color: "#475569",
      marginBottom: 12,
    },
    ul: {
      marginTop: 4,
      marginBottom: 12,
      paddingLeft: 18,
      color: "#475569",
      lineHeight: 1.8,
      fontSize: 15,
    },
    callout: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 14,
      color: "#334155",
      lineHeight: 1.8,
      fontSize: 14,
      marginTop: 10,
      marginBottom: 6,
    },
    buttonRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: 22,
    },
    primaryBtn: {
      background: "#2563eb",
      color: "white",
      padding: "12px 16px",
      borderRadius: 12,
      fontSize: 15,
      border: "none",
      cursor: "pointer",
      fontWeight: 900,
      transition: "0.2s",
    },
    secondaryBtn: {
      background: "#ffffff",
      color: "#0f172a",
      padding: "12px 16px",
      borderRadius: 12,
      fontSize: 15,
      border: "1px solid #e2e8f0",
      cursor: "pointer",
      fontWeight: 900,
      transition: "0.2s",
    },
    footerNote: {
      marginTop: 18,
      textAlign: "center",
      color: "#64748b",
      fontSize: 12,
      lineHeight: 1.6,
    },
    hr: { border: "none", borderTop: "1px solid #e2e8f0", margin: "18px 0" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Privacy Policy</h1>
        <div style={styles.subTitle}>
          This policy explains how Alitrite handles information when you use the site.
        </div>
        <div style={styles.meta}>
          <strong>Effective Date:</strong> {effectiveDate}
        </div>
        <div style={styles.badge}>Alitrite</div>

        <div style={styles.callout}>
          <strong>Amazon Associates disclosure:</strong> As an Amazon Associate I earn from qualifying purchases.
          {/* Required disclosure language per Amazon Associates guidance. */}
        </div>

        <h2 style={styles.sectionTitle}>1) What Alitrite is</h2>
        <p style={styles.paragraph}>
          Alitrite is an AI-assisted product checker. You paste an Amazon product link, and we return a rating and
          short reasoning intended to help you spot scams, sketchy listings, and bad value.
        </p>

        <h2 style={styles.sectionTitle}>2) Information we collect</h2>
        <p style={styles.paragraph}>
          We try to keep this minimal. Depending on how the site is implemented, Alitrite may process and/or temporarily
          store:
        </p>
        <ul style={styles.ul}>
          <li>
            <strong>Product link you submit</strong> (the Amazon URL) so we can run the analysis.
          </li>
          <li>
            <strong>Analysis output</strong> (rating + reasoning) so we can display results and troubleshoot issues.
          </li>
          <li>
            <strong>Basic technical data</strong> that most web services receive (e.g., IP address, browser type, device
            info, timestamps) for security, rate limiting, and debugging.
          </li>
        </ul>
        <p style={styles.paragraph}>
          Alitrite does <strong>not</strong> require accounts to run checks, and we do not require your name, payment
          details, or other direct identifiers for the basic flow.
        </p>

        <h2 style={styles.sectionTitle}>3) How we use information</h2>
        <p style={styles.paragraph}>
          We use information to:
        </p>
        <ul style={styles.ul}>
          <li>Run the product analysis you requested.</li>
          <li>Show your results on-screen.</li>
          <li>Maintain security (spam prevention, abuse detection, rate limiting).</li>
          <li>Debug and improve reliability (e.g., error logs).</li>
        </ul>

        <h2 style={styles.sectionTitle}>4) Affiliate links and Amazon tracking</h2>
        <p style={styles.paragraph}>
          Alitrite may include links to Amazon. Some of these links may be <strong>affiliate links</strong>. When you click
          an Amazon link, <strong>Amazon</strong> (not Alitrite) may use cookies and/or similar technologies to track your
          visit and attribute qualifying purchases for commission purposes. Amazon’s data practices are governed by
          Amazon’s own privacy notices and policies.
        </p>
        <div style={styles.callout}>
          <strong>Important:</strong> The required Amazon Associates statement is:
          <br />
          <strong>“As an Amazon Associate I earn from qualifying purchases.”</strong>
          <br />
          This statement must appear clearly and conspicuously on the site. Also, link-level disclosures should be clear
          and near affiliate links (e.g., “paid link”).{" "}
          {/* Amazon disclosure guidance */}
        </div>

        <h2 style={styles.sectionTitle}>5) Cookies</h2>
        <p style={styles.paragraph}>
          Alitrite may use minimal, functional storage (like local storage) to improve your experience (for example,
          remembering UI state). We aim to avoid unnecessary tracking.
        </p>
        <p style={styles.paragraph}>
          Separately, if you click out to Amazon through an affiliate link, Amazon may set cookies for attribution and
          other purposes. See Amazon’s privacy notice for details.
        </p>

        <h2 style={styles.sectionTitle}>6) Third-party links</h2>
        <p style={styles.paragraph}>
          The site may contain links to third-party websites (such as Amazon). We are not responsible for the privacy
          practices of third parties. Review their policies before providing information to them.
        </p>

        <h2 style={styles.sectionTitle}>7) Children’s privacy</h2>
        <p style={styles.paragraph}>
          Alitrite is not directed to children under 13, and we do not knowingly collect personal information from
          children under 13.
        </p>

        <h2 style={styles.sectionTitle}>8) Data retention</h2>
        <p style={styles.paragraph}>
          We keep information only as long as needed for the purposes described above (for example, short-term logs for
          security/debugging). Retention may vary depending on how the service is configured and what is necessary for
          safety and reliability.
        </p>

        <h2 style={styles.sectionTitle}>9) Security</h2>
        <p style={styles.paragraph}>
          We use reasonable safeguards to protect the service. However, no method of transmission or storage is 100%
          secure. Please avoid submitting sensitive personal information in any free-text fields.
        </p>

        <h2 style={styles.sectionTitle}>10) Changes to this policy</h2>
        <p style={styles.paragraph}>
          We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised
          effective date.
        </p>

        <hr style={styles.hr} />

        <div style={styles.buttonRow}>
          <button style={styles.secondaryBtn} onClick={() => router.push("/")}>
            Back to Home
          </button>
          <button style={styles.primaryBtn} onClick={() => router.push("/droplink")}>
            Check a product →
          </button>
        </div>

        <div style={styles.footerNote}>
          {year} © Alitrite · This policy is informational and not legal advice.
        </div>
      </div>
    </div>
  );
}
