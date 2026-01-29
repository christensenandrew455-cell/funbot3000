"use client";

import { useState, useEffect } from "react";

export default function ResultsClient({ url }) {
  const [aiResult, setAiResult] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!url) return;
    setError("");
    setAiResult(null);
    setScreenshot(null);

    const fetchData = async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setScreenshot(data.base64 || null);
        setAiResult(data.aiResult || null);
      } catch (err) {
        console.error(err);
        setError("Failed to load results");
      }
    };

    fetchData();
  }, [url]);

  function renderStars(score) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= score ? "#F59E0B" : "#ddd", fontSize: 20, marginRight: 2 }}>
          ★
        </span>
      );
    }
    return <div>{stars}</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {screenshot && (
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h4>Product Screenshot:</h4>
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Product screenshot"
            style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          />
        </div>
      )}

      {aiResult && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
          <h2 style={{ marginBottom: 16 }}>{aiResult.title || "No Title Found"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <strong>Website Trust</strong>
              {renderStars(aiResult.websiteTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>{aiResult.websiteTrust?.reason || "N/A"}</p>
            </div>
            <div>
              <strong>Seller Trust</strong>
              {renderStars(aiResult.sellerTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>{aiResult.sellerTrust?.reason || "N/A"}</p>
            </div>
            <div>
              <strong>Product Trust</strong>
              {renderStars(aiResult.productTrust?.score || 0)}
              <p style={{ fontSize: 12 }}>{aiResult.productTrust?.reason || "N/A"}</p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
            <strong>Overall Rating</strong>
            {renderStars(aiResult.overall?.score || 0)}
            <p style={{ fontSize: 14 }}>{aiResult.overall?.reason || "No reasoning provided"}</p>
          </div>

          {aiResult.status === "bad" && aiResult.alternative && (
            <p style={{ marginTop: 16 }}>
              <strong>Alternative:</strong>{" "}
              <a href={aiResult.alternative.url} target="_blank" rel="noreferrer">
                {aiResult.alternative.title} - {aiResult.alternative.price}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
