"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setResult(data);
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
        <h1 style={styles.title}>Link → AI</h1>
        <p style={styles.subtitle}>
          Paste a link from any website. The AI will handle the rest.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Processing..." : "Send to AI"}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <pre style={styles.result}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    padding: 20,
  },
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
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
  error: {
    color: "red",
    marginTop: 12,
  },
  result: {
    marginTop: 20,
    padding: 16,
    background: "#f1f3f6",
    borderRadius: 10,
    textAlign: "left",
    fontSize: 13,
    overflowX: "auto",
  },
};
