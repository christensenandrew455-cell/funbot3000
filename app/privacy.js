"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicy() {
  const router = useRouter();

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "40px 20px",
      background: "linear-gradient(to right, #f0f4ff, #ffffff)",
      fontFamily: "'Inter', sans-serif",
    },
    card: {
      background: "white",
      padding: 32,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      maxWidth: 720,
      width: "100%",
      display: "flex",
      flexDirection: "column",
    },
    title: {
      fontSize: 32,
      fontWeight: 800,
      marginBottom: 20,
      textAlign: "center",
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 700,
      marginTop: 20,
      marginBottom: 10,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 1.6,
      color: "#555",
      marginBottom: 12,
    },
    button: {
      background: "#4A6CF7",
      color: "white",
      padding: "12px 20px",
      borderRadius: 12,
      fontSize: 16,
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      alignSelf: "center",
      marginTop: 24,
      transition: "0.2s",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Privacy Policy – Fun Bot 3000</h1>
        <p style={styles.paragraph}><strong>Effective Date:</strong> December 9, 2025</p>

        <p style={styles.paragraph}>
          Fun Bot 3000 (“we”, “our”, “the site”) values your privacy. This Privacy Policy explains how we handle information when you use our website.
        </p>

        <h2 style={styles.sectionTitle}>1. Information We Collect</h2>
        <p style={styles.paragraph}>
          Fun Bot 3000 does <strong>not collect personal information</strong> such as your name, email, or payment details. The only data stored is your activity preferences and generated activities, which are saved <strong>locally in your browser session</strong> for convenience.
        </p>

        <h2 style={styles.sectionTitle}>2. How We Use Your Data</h2>
        <p style={styles.paragraph}>
          The data stored in your session is used solely to:
        </p>
        <ul style={{ marginBottom: 12 }}>
          <li>Generate personalized activities.</li>
          <li>Remember your previous activity for continuity.</li>
        </ul>
        <p style={styles.paragraph}>
          No data is transmitted to third parties unless you explicitly share it via external APIs (for example, when you click a link).
        </p>

        <h2 style={styles.sectionTitle}>3. Cookies and Tracking</h2>
        <p style={styles.paragraph}>
          Fun Bot 3000 does <strong>not use cookies, trackers, or analytics</strong>. All your activity data exists temporarily in your browser session and is deleted when you close the site.
        </p>

        <h2 style={styles.sectionTitle}>4. Third-Party Links</h2>
        <p style={styles.paragraph}>
          Our site may contain links to third-party websites (e.g., TheTestifyAI, RateMyRoutine). We are <strong>not responsible for the privacy practices or content</strong> of these sites. We encourage you to read their privacy policies before interacting with them.
        </p>

        <h2 style={styles.sectionTitle}>5. Children’s Privacy</h2>
        <p style={styles.paragraph}>
          Fun Bot 3000 is <strong>not intended for children under 13</strong>, and we do not knowingly collect information from children.
        </p>

        <h2 style={styles.sectionTitle}>6. Security</h2>
        <p style={styles.paragraph}>
          We take reasonable measures to protect your session data from unauthorized access. However, since all data is stored in your browser, <strong>we cannot guarantee complete security</strong>. Do not share your device with others if you wish to keep your activity data private.
        </p>

        <h2 style={styles.sectionTitle}>7. Changes to This Policy</h2>
        <p style={styles.paragraph}>
          We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.
        </p>

        <h2 style={styles.sectionTitle}>8. Contact Us</h2>
        <p style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at: <br />
          <strong>Email:</strong> support@funbot3000.com
        </p>

        {/* Back to Home Button */}
        <button style={styles.button} onClick={() => router.push("/")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

