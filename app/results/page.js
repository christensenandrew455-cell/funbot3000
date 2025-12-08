"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("funbot3000_result");
    if (raw) {
      try {
        setResult(JSON.parse(raw));
      } catch (e) {
        setResult(null);
      }
    }
  }, []);

  if (!result) {
    return (
      <div style={{ maxWidth: 800, margin: "48px auto", textAlign: "center" }}>
        <div style={{ background: "#fff", padding: 28, borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: 0 }}>No result found</h2>
          <p style={{ color: "#6b7280" }}>Generate an activity on the home page first.</p>
          <button onClick={() => router.push("/")} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8 }}>Go home</button>
        </div>
      </div>
    );
  }

  async function regenerate() {
    const inputs = (result.meta && result.meta.inputs) || JSON.parse(sessionStorage.getItem("funbot3000_form") || "{}");
    setLoading(true);
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputs) });
    const body = await res.json();
    sessionStorage.setItem("funbot3000_result", JSON.stringify(body));
    setResult(body);
    setOpen(false);
    setLoading(false);
  }

  function updateInfo() {
    // redirect to home — the form reads sessionStorage to repopulate if you saved it earlier
    router.push("/");
  }

  function copySummary() {
    const text = `${result.title}\n\n${result.quick}\n\n${result.detail}`;
    navigator.clipboard?.writeText(text).then(() => alert("Copied to clipboard"));
  }

  return (
    <div style={{ maxWidth: 880, margin: "36px auto", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.08)", padding: 22 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{result.title}</h1>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(result.meta?.generatedAt || Date.now()).toLocaleString()}</div>
        </div>

        <div style={{ marginTop: 10, color: "#374151" }}>{result.quick}</div>

        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #e6eef8",
              background: "#f9fafb",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {open ? "Hide details" : "Show details"}
          </button>

          {open && (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#fff", border: "1px solid #eef2ff", lineHeight: 1.6 }}>
              {result.detail}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={regenerate}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 700,
              borderRadius: 10,
              border: "none",
              cursor: "pointer"
            }}
          >
            {loading ? "Generating..." : "Generate again"}
          </button>

          <button
            onClick={updateInfo}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Update information
          </button>

          <button
            onClick={copySummary}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Copy
          </button>
        </div>

        {/* show the inputs back below so user can see what they sent (read-only) */}
        <div style={{ marginTop: 18, padding: 12, borderRadius: 8, background: "#fbfbff", border: "1px solid #eef2ff" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Submitted info</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, color: "#334155" }}>
            {JSON.stringify(result.meta?.inputs || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
