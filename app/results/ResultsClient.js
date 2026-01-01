"use client";

import { useState } from "react";

export default function ResultsClient() {
  const [aiResult, setAiResult] = useState(null);
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

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
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
        </div>
      )}
    </div>
  );
}
