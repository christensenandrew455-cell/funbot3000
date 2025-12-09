"use client";

import { useEffect, useState } from "react";

export default function ResultsClient() {
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [showLong, setShowLong] = useState(false);
  const [sessionData, setSessionData] = useState(undefined); // undefined = still loading, null = explicit no data
  const [editing, setEditing] = useState(false);

  // Load stored data & result — NO API CALL ON LOAD if aiResult exists
  useEffect(() => {
    try {
      const rawData = sessionStorage.getItem("activityData");
      const rawAi = sessionStorage.getItem("aiResult");

      if (rawData === null) {
        setSessionData(null);
      } else {
        try {
          setSessionData(JSON.parse(rawData));
        } catch {
          setSessionData(null);
        }
      }

      if (rawAi) {
        try {
          setAiResult(JSON.parse(rawAi));
        } catch {
          setAiResult(null);
        }
      } else {
        setAiResult(null);
      }
    } catch {
      setSessionData(null);
      setAiResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchAi(data) {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ?? {}),
      });
      const json = await res.json();
      setAiResult(json.aiResult);
      try {
        sessionStorage.setItem("aiResult", JSON.stringify(json.aiResult));
      } catch {}
    } catch (err) {
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

  // Save edits and regenerate
  function handleSaveEdits(data) {
    try {
      sessionStorage.setItem("activityData", JSON.stringify(data));
    } catch {}
    setSessionData(data);
    setEditing(false);
    fetchAi(data);
  }

  // No clear all in this version (per request)

  if (loading) return <div>Loading...</div>;

  if (editing) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
        <h2>Edit Your Preferences</h2>
        <EditForm initial={sessionData} onSave={handleSaveEdits} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  if (!aiResult)
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
        <h1 style={{ fontSize: 24 }}>No activity found</h1>
        <p style={{ marginTop: 8 }}>
          You haven't generated an activity yet. Go back and generate one or fill preferences below.
        </p>

        <div style={{ marginTop: 18 }}>
          <EditForm
            initial={sessionData !== null ? sessionData : {}}
            onSave={(data) => {
              try {
                sessionStorage.setItem("activityData", JSON.stringify(data));
              } catch {}
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24 }}>{title}</h1>

      <p style={{ marginTop: 8 }}>{short}</p>

      {!showLong ? (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowLong(true)}>More</button>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 12 }} />
          <div>{long}</div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button onClick={handleGenerateAgain} style={{ marginRight: 8 }}>
          Don't like it? Generate again
        </button>

        {sessionData !== null && (
          <button onClick={handleEditData} style={{ marginRight: 8 }}>
            Edit data
          </button>
        )}
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

  function update(k, v) {
    setState((s) => ({ ...s, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(state);
      }}
      style={{
        marginTop: 8,
        border: "1px solid #eee",
        padding: 8,
        borderRadius: 6,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <select value={state.personality} onChange={(e) => update("personality", e.target.value)}>
          <option value=""></option>
          <option value="extrovert">Extrovert</option>
          <option value="introvert">Introvert</option>
        </select>

        <select value={state.locationPref} onChange={(e) => update("locationPref", e.target.value)}>
          <option value=""></option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
        </select>

        <select value={state.season} onChange={(e) => update("season", e.target.value)}>
          <option value=""></option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Min age" value={state.minAge} onChange={(e) => update("minAge", e.target.value.replace(/\D/g, ""))} />
          <input placeholder="Max age" value={state.maxAge} onChange={(e) => update("maxAge", e.target.value.replace(/\D/g, ""))} />
        </div>

        <input placeholder="Number of people" value={state.numPeople} onChange={(e) => update("numPeople", e.target.value.replace(/\D/g, ""))} />

        {/* Place fields */}
        <input placeholder="Country (type)" value={state.country} onChange={(e) => update("country", e.target.value)} />

        {state.country && (
          <input placeholder="State / Province (type)" value={state.state} onChange={(e) => update("state", e.target.value)} />
        )}

        {state.state && (
          <input placeholder="City / Town (type)" value={state.city} onChange={(e) => update("city", e.target.value)} />
        )}

        <textarea placeholder="Extra notes" value={state.extraInfo} onChange={(e) => update("extraInfo", e.target.value)} />

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">Save & Generate Activity</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
