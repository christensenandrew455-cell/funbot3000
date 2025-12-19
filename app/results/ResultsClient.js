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
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    marginTop: 6,
  },
};

export default function ResultsClient() {
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [editing, setEditing] = useState(false);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const d = sessionStorage.getItem("activityData");
    const a = sessionStorage.getItem("aiResult");
    setSessionData(d ? JSON.parse(d) : {});
    setAiResult(a ? JSON.parse(a) : null);
    setLoading(false);
  }, []);

  async function fetchAi(data) {
    setLoading(true);
    const previousActivity = sessionStorage.getItem("previousActivity") || "";

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

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>Generating...</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <EditForm
            initial={sessionData}
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>{aiResult?.title}</h1>
        <p>{aiResult?.short}</p>
        <p>{aiResult?.long}</p>

        <div style={{ marginTop: 20 }}>
          <button style={styles.buttonPrimary} onClick={() => fetchAi(sessionData)}>
            Generate Again
          </button>
          <button
            style={{ ...styles.buttonSecondary, marginLeft: 12 }}
            onClick={() => setEditing(true)}
          >
            Edit Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function EditForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    personality: initial.personality || "",
    locationPref: initial.locationPref || "",
    season: initial.season || "",
    ageCategory: initial.ageCategory || "",
    groupSize: initial.groupSize || "",
    chaos: initial.chaos || "calm",
    cityType: initial.cityType || "",
    extraInfo: initial.extraInfo || "",
  });

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  const fields = {
    personality: ["Extrovert", "Introvert"],
    locationPref: ["Inside", "Outside", "Both"],
    season: ["Spring", "Summer", "Autumn/Fall", "Winter"],
    ageCategory: ["Kids", "Teenagers", "Adults", "Mixed"],
    groupSize: ["Solo (1)", "2-4", "Group (5+)"],
    chaos: ["Calm", "Little Spicy", "Crazy"],
    cityType: ["City", "Town"],
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      style={{ display: "grid", gap: 14 }}
    >
      {Object.entries(fields).map(([key, opts]) => (
        <select
          key={key}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          style={styles.input}
        >
          <option value="">Select {key}</option>
          {opts.map((o) => (
            <option
              key={o}
              value={o.toLowerCase().replace(/\s|\(|\)|\//g, "")}
            >
              {o}
            </option>
          ))}
        </select>
      ))}

      <textarea
        placeholder="Extra notes"
        value={form.extraInfo}
        onChange={(e) => update("extraInfo", e.target.value)}
        style={{ ...styles.input, minHeight: 80 }}
      />

      <div>
        <button type="submit" style={styles.buttonPrimary}>
          Save & Generate
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...styles.buttonSecondary, marginLeft: 12 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
