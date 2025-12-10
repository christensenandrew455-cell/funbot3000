"use client";

import { useEffect, useState } from "react";

export default function ResultsClient() {
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [showLong, setShowLong] = useState(false);
  const [sessionData, setSessionData] = useState(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const rawData = sessionStorage.getItem("activityData");
      const rawAi = sessionStorage.getItem("aiResult");

      if (rawData === null) setSessionData(null);
      else {
        try { setSessionData(JSON.parse(rawData)); } 
        catch { setSessionData(null); }
      }

      if (rawAi) {
        try { setAiResult(JSON.parse(rawAi)); } 
        catch { setAiResult(null); }
      } else setAiResult(null);

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

      try {
        sessionStorage.setItem("aiResult", JSON.stringify(json.aiResult));
        if (json.aiResult?.title) sessionStorage.setItem("previousActivity", json.aiResult.title);
      } catch {}
    } catch {
      setAiResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAgain() {
    await fetchAi(sessionData ?? {});
    setShowLong(false);
  }

  function handleEditData() {
    setEditing(true);
  }

  function handleSaveEdits(data) {
    try { sessionStorage.setItem("activityData", JSON.stringify(data)); } catch {}
    setSessionData(data);
    setEditing(false);
    fetchAi(data);
  }

  // --- STYLES ---
  const fullCenter = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    flexDirection: "column",
  };

  const cardStyle = {
    background: "white",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    width: "100%",
  };

  const buttonPrimary = {
    background: "#4A6CF7",
    color: "white",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 15,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  };

  const buttonSecondary = {
    background: "#f1f1f1",
    color: "#333",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 15,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 500,
  };

  const centerButtons = {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 18,
    flexWrap: "wrap",
  };

  if (loading)
    return (
      <div style={fullCenter}>
        <div>Loading...</div>
      </div>
    );

  if (editing)
    return (
      <div style={fullCenter}>
        <div style={{ maxWidth: 720, width: "100%" }}>
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
      <div style={fullCenter}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <h1 style={{ fontSize: 24 }}>No activity found</h1>
          <p style={{ marginTop: 8 }}>You haven't generated an activity yet.</p>
          <div style={{ marginTop: 18 }}>
            <EditForm
              initial={sessionData !== null ? sessionData : {}}
              onSave={(data) => { setSessionData(data); fetchAi(data); }}
              onCancel={() => {}}
            />
          </div>
        </div>
      </div>
    );

  const title = aiResult?.title || "Activity";
  const short = aiResult?.short || "";
  const long = aiResult?.long || "";

  return (
    <div style={fullCenter}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 24, textAlign: "center" }}>{title}</h1>
        <p style={{ marginTop: 8, textAlign: "center" }}>{short}</p>

        {!showLong ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => setShowLong(true)} style={buttonSecondary}>
              More
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 12, textAlign: "center" }}>{long}</div>
        )}

        <div style={centerButtons}>
          <button onClick={handleGenerateAgain} style={buttonPrimary}>
            Don't like it? Generate again
          </button>
          {sessionData !== null && (
            <button onClick={handleEditData} style={buttonSecondary}>
              Edit data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditForm({ initial = {}, onSave, onCancel }) {
  const [state, setState] = useState({
    personality: initial?.personality || "",
    locationPref: initial?.locationPref || "",
    season: initial?.season || "",
    minAge: initial?.minAge || "",
    maxAge: initial?.maxAge || "",
    numPeople: initial?.numPeople || "",
    extraInfo: initial?.extraInfo || "",
    country: initial?.country || "",
    state: initial?.state || "",
    city: initial?.city || "",
  });

  function update(k, v) { setState((s) => ({ ...s, [k]: v })); }

  const inputStyle = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", fontSize: 14 };
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(state); }}
      style={{ marginTop: 8, display: "grid", gap: 10 }}
    >
      <label style={labelStyle}>
        Personality:
        <select value={state.personality} onChange={(e) => update("personality", e.target.value)} style={inputStyle}>
          <option value=""></option>
          <option value="extrovert">Extrovert</option>
          <option value="introvert">Introvert</option>
        </select>
      </label>

      <label style={labelStyle}>
        Inside / Outside:
        <select value={state.locationPref} onChange={(e) => update("locationPref", e.target.value)} style={inputStyle}>
          <option value=""></option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
          <option value="both">Both</option>
        </select>
      </label>

      <label style={labelStyle}>
        Season:
        <select value={state.season} onChange={(e) => update("season", e.target.value)} style={inputStyle}>
          <option value=""></option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <input placeholder="Min age" value={state.minAge} onChange={(e) => update("minAge", e.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, flex: 1 }} />
        <input placeholder="Max age" value={state.maxAge} onChange={(e) => update("maxAge", e.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, flex: 1 }} />
      </div>

      <input placeholder="Number of people" value={state.numPeople} onChange={(e) => update("numPeople", e.target.value.replace(/\D/g, ""))} style={inputStyle} />
      <input placeholder="Country" value={state.country} onChange={(e) => update("country", e.target.value)} style={inputStyle} />
      {state.country && <input placeholder="State / Province" value={state.state} onChange={(e) => update("state", e.target.value)} style={inputStyle} />}
      {state.state && <input placeholder="City / Town" value={state.city} onChange={(e) => update("city", e.target.value)} style={inputStyle} />}
      <textarea placeholder="Extra notes" value={state.extraInfo} onChange={(e) => update("extraInfo", e.target.value)} style={{ ...inputStyle, height: 80, resize: "none" }} />

      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <button type="submit" style={{ ...buttonPrimary }}>Save & Generate Activity</button>
        <button type="button" onClick={onCancel} style={{ ...buttonSecondary }}>Cancel</button>
      </div>
    </form>
  );
}
