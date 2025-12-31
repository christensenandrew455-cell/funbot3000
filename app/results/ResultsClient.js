"use client";

import { useState } from "react";

export default function ResultsClient() {
  const [url, setUrl] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function renderStars(score) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= score ? "#F59E0B" : "#ddd",
            fontSize: 20,
            marginRight: 2,
          }}
        >
          ★
        </span>
      );
    }
    return <div>{stars}</div>;
  }

  async function fetchAi() {
    if (!url) {
      setError("Please enter a product link.");
      return;
    }

    setLoading(true);
    setError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      setAiResult(data.aiResult);
    } catch (err) {
      console.error(err);
      setError("Failed to generate review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      {/* Clickable header/logo */}
      <h1
        style={{
          cursor: "pointer",
          textAlign: "center",
          marginBottom: 24,
          fontSize: 28,
          fontWeight: 700,
        }}
        onClick={() => (window.location.href = "/")}
      >
        Product Link Analyzer
      </h1>

      <input
        type="url"
        placeholder="https://example-product.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ padding: 12, width: "100%", marginBottom: 12 }}
      />

      <button
        onClick={fetchAi}
        disabled={loading}
        style={{ padding: 12, fontSize: 16, marginBottom: 16 }}
      >
        {loading ? "Processing..." : "Generate Review"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {aiResult && (
        <div
          style={{
            marginTop: 20,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ marginBottom: 16 }}>
            {aiResult.title || "No Title Found"}
          </h2>

          {/* Ratings */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <strong>Website Trust</strong>
              {renderStars(aiResult.websiteTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>
                {aiResult.websiteTrust?.reason || "N/A"}
              </p>
            </div>
            <div>
              <strong>Seller Trust</strong>
              {renderStars(aiResult.sellerTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>
                {aiResult.sellerTrust?.reason || "N/A"}
              </p>
            </div>
            <div>
              <strong>Product Trust</strong>
              {renderStars(aiResult.productTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>
                {aiResult.productTrust?.reason || "N/A"}
              </p>
            </div>
          </div>

          {/* Overall Rating */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
            <strong>Overall Rating</strong>
            {renderStars(aiResult.overall?.score || 0)}
            <p style={{ fontSize: 14 }}>
              {aiResult.overall?.reason || "No reasoning provided"}
            </p>
          </div>

          {/* Alternative if bad */}
          {aiResult.status === "bad" && aiResult.alternative && (
            <p style={{ marginTop: 16 }}>
              <strong>Alternative:</strong>{" "}
              <a href={aiResult.alternative} target="_blank" rel="noreferrer">
                {aiResult.alternative}
              </a>
            </p>
          )}

          {/* Drop Link Button */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                fontSize: 16,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "#000" }}>Drop </span>
              <span style={{ color: "#3B82F6", textDecoration: "underline" }}>
                Link
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
