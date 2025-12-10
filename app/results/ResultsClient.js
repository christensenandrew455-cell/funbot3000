"use client";

import { useEffect, useState } from "react";

// --- STYLES ---
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
    transition: "0.2s",
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
    transition: "0.2s",
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
    } catch {
      setSessionData(null);
      setAiResult(null);
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
      if (json.aiResult?.title)
        sessionStorage.setItem("previousActivity", json.aiResult.title);
    } catch (err) {
      console.error(err);
      setAiResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleEditData() {
    setEditing(true);
  }

  function handleSaveEdits(data) {
    sessionStorage.setItem("activityData", JSON.stringify(data));
    setSessionData(data);
    setEditing(false);
    fetchAi(data);
  }

  async function handleGenerateAgain() {
    await fetchAi(sessionData ?? {});
    setShowLong(false);
  }

  if (loading)
    return (
      <div style={styles.container}>
        <div style={styles.card}>Generating activity...</div>
      </div>
    );

  if (editing)
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Edit Your Preferences</h2>
          <EditForm
            initial={sessionData}
            onSave={handleSaveEdits}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );

  if (!aiResult)
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>No activity found</h1>
          <p style={styles.description}>
            You haven't generated an activity yet. Fill in your preferences to get started!
          </p>
          <EditForm
            initial={sessionData ?? {}}
            onSave={(data) => {
              setSessionData(data);
              fetchAi(data);
            }}
            onCancel={() => {}}
          />
        </div>
      </div>
    );

  const title = aiResult?.title || "Activity";
  const short = aiResult?.short || "";
  const long = aiResult?.long || "";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>{title}</h1>
        <p style={styles.description}>{short}</p>

        {showLong ? (
          <div style={styles.longDescription}>{long}</div>
        ) : (
          <button
            style={styles.buttonSecondary}
            onClick={() => setShowLong(true)}
          >
            Read more
          </button>
        )}

        <div style={styles.centerButtons}>
          <button style={styles.buttonPrimary} onClick={handleGenerateAgain}>
            Don't like it? Generate again
          </button>
          {sessionData && (
            <button style={styles.buttonSecondary} onClick={handleEditData}>
              Edit preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditForm({ initial = {}, onSave, onCancel }) {
  const [state, setState] = useState({
    personality: initial.personality || "",
    locationPref: initial.locationPref || "",
    season: initial.season || "",
    minAge: initial.minAge || "",
    maxAge: initial.maxAge || "",
    numPeople: initial.numPeople || "",
    extraInfo: initial.extraInfo || "",
    country: initial.country || "",
    state: initial.state || "",
    city: initial.city || "",
  });

  const inputStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    fontSize: 14,
    outline: "none",
    transition: "0.2s",
  };
  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
  };

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
      <label style={labelStyle}>
        Personality:
        <select
          value={state.personality}
          onChange={(e) => update("personality", e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="extrovert">Extrovert</option>
          <option value="introvert">Introvert</option>
        </select>
      </label>

      <label style={labelStyle}>
        Inside / Outside:
        <select
          value={state.locationPref}
          onChange={(e) => update("locationPref", e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
          <option value="both">Both</option>
        </select>
      </label>

      <label style={labelStyle}>
        Season:
        <select
          value={state.season}
          onChange={(e) => update("season", e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn/Fall</option>
          <option value="winter">Winter</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          placeholder="Min age"
          value={state.minAge}
          onChange={(e) => update("minAge", e.target.value.replace(/\D/g, ""))}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          placeholder="Max age"
          value={state.maxAge}
          onChange={(e) => update("maxAge", e.target.value.replace(/\D/g, ""))}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <input
        placeholder="Number of people"
        value={state.numPeople}
        onChange={(e) => update("numPeople", e.target.value.replace(/\D/g, ""))}
        style={inputStyle}
      />

      <input
        placeholder="Country"
        value={state.country}
        onChange={(e) => update("country", e.target.value)}
        style={inputStyle}
      />
      {state.country && (
        <input
          placeholder="State / Province"
          value={state.state}
          onChange={(e) => update("state", e.target.value)}
          style={inputStyle}
        />
      )}
      {state.state && (
        <input
          placeholder="City / Town"
          value={state.city}
          onChange={(e) => update("city", e.target.value)}
          style={inputStyle}
        />
      )}

      <textarea
        placeholder="Extra notes"
        value={state.extraInfo}
        onChange={(e) => update("extraInfo", e.target.value)}
        style={{ ...inputStyle, height: 80, resize: "none" }}
      />

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button type="submit" style={styles.buttonPrimary}>
          Save & Generate Activity
        </button>
        <button type="button" onClick={onCancel} style={styles.buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
