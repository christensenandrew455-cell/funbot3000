"use client";

import { useEffect, useState } from "react";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    flexDirection: "column",
    background: "linear-gradient(to right, #f0f4ff, #ffffff)",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    maxWidth: 720,
    width: "100%",
    textAlign: "center",
  },
  buttonPrimary: {
    background: "#4A6CF7",
    color: "white",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonSecondary: {
    background: "#f1f1f1",
    color: "#333",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 16,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 500,
  },
  centerButtons: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
    flexWrap: "wrap",
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  longDescription: {
    marginTop: 12,
    fontSize: 15,
    color: "#444",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
};

export default function ResultsClient() {
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [showLong, setShowLong] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const rawData = sessionStorage.getItem("activityData");
      const rawAi = sessionStorage.getItem("aiResult");
      setSessionData(rawData ? JSON.parse(rawData) : null);
      setAiResult(rawAi ? JSON.parse(rawAi) : null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchAi(data) {
    setLoading(true);
    const previousActivity = sessionStorage.getItem("previousActivity") || "";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, previousActivity }),
      });

      const json = await res.json();
      setAiResult(json.aiResult);
      sessionStorage.setItem("aiResult", JSON.stringify(json.aiResult));

      if (json.aiResult?.title) {
        sessionStorage.setItem("previousActivity", json.aiResult.title);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>Generating activity...</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Edit Preferences</h2>
          <EditForm
            initial={sessionData || {}}
            onSave={(data) => {
              sessionStorage.setItem("activityData", JSON.stringify(data));
              setSessionData(data);
              setEditing(false);
              fetchAi(data);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  if (!aiResult) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>No activity found</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>{aiResult.title}</h1>
        <p style={styles.description}>{aiResult.short}</p>

        {showLong ? (
          <div style={styles.longDescription}>{aiResult.long}</div>
        ) : (
          <button style={styles.buttonSecondary} onClick={() => setShowLong(true)}>
            Read more
          </button>
        )}

        <div style={styles.centerButtons}>
          <button style={styles.buttonPrimary} onClick={() => fetchAi(sessionData || {})}>
            Generate again
          </button>
          <button style={styles.buttonSecondary} onClick={() => setEditing(true)}>
            Edit preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function EditForm({ initial, onSave, onCancel }) {
  const [state, setState] = useState({
    personality: initial.personality || "",
    locationPref: initial.locationPref || "",
    season: initial.season || "",
    ageCategory: initial.ageCategory || "",
    groupSize: initial.groupSize || "",
    chaos: initial.chaos || "",
    cityType: initial.cityType || "",
    extraInfo: initial.extraInfo || "",
  });

  function update(k, v) {
    setState((s) => ({ ...s, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(state);
      }}
      style={{ display: "grid", gap: 12 }}
    >
      {Object.keys(state).map((key) => (
        <input
          key={key}
          placeholder={key}
          value={state[key]}
          onChange={(e) => update(key, e.target.value)}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
          }}
        />
      ))}

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button type="submit" style={styles.buttonPrimary}>
          Save & Generate
        </button>
        <button type="button" onClick={onCancel} style={styles.buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
