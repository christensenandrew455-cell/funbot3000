"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResultsClient() {
  const params = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [showLong, setShowLong] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [editing, setEditing] = useState(false);

  // Load stored data & result — NO API CALL HERE
  useEffect(() => {
    const saved = sessionStorage.getItem("activityData");
    const savedAI = sessionStorage.getItem("aiResult");

    if (saved) setSessionData(JSON.parse(saved));
    if (savedAI) setAiResult(JSON.parse(savedAI));

    setLoading(false);
  }, []);

  async function fetchAi(data) {
    setLoading(true);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setAiResult(json.aiResult);
    sessionStorage.setItem("aiResult", JSON.stringify(json.aiResult));

    setLoading(false);
  }

  async function handleGenerateAgain() {
    await fetchAi(sessionData ?? {});
    setShowLong(false);
  }

  function handleEditData() {
    setEditing(true);
  }

  function handleClearAll() {
    sessionStorage.removeItem("activityData");
    sessionStorage.removeItem("aiResult");
    setSessionData(null);
    setAiResult(null);
    setEditing(false);
  }

  if (loading) return <div>Loading...</div>;

  if (editing) {
    return (
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
    );
  }

  if (!aiResult) return <div>No activity found. Go back and generate one.</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24 }}>{aiResult.title}</h1>

      <p>{aiResult.short}</p>

      {!showLong ? (
        <button onClick={() => setShowLong(true)}>More</button>
      ) : (
        <p>{aiResult.long}</p>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={handleGenerateAgain} style={{ marginRight: 8 }}>
          Don't like it? Generate again
        </button>

        {sessionData && (
          <>
            <button onClick={handleEditData} style={{ marginRight: 8 }}>
              Edit data
            </button>
            <button onClick={handleClearAll}>Clear all</button>
          </>
        )}
      </div>
    </div>
  );
}

function EditForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h2>Edit Your Preferences</h2>

      <select
        value={form.personality}
        onChange={(e) => update("personality", e.target.value)}
      >
        <option value=""></option>
        <option value="extrovert">Extrovert</option>
        <option value="introvert">Introvert</option>
      </select>

      <select
        value={form.locationPref}
        onChange={(e) => update("locationPref", e.target.value)}
      >
        <option value=""></option>
        <option value="inside">Inside</option>
        <option value="outside">Outside</option>
      </select>

      <select value={form.season} onChange={(e) => update("season", e.target.value)}>
        <option value=""></option>
        <option value="spring">Spring</option>
        <option value="summer">Summer</option>
        <option value="autumn">Autumn</option>
        <option value="winter">Winter</option>
      </select>

      <input
        placeholder="Min age"
        value={form.minAge}
        onChange={(e) => update("minAge", e.target.value)}
      />

      <input
        placeholder="Max age"
        value={form.maxAge}
        onChange={(e) => update("maxAge", e.target.value)}
      />

      <input
        placeholder="Number of people"
        value={form.numPeople}
        onChange={(e) => update("numPeople", e.target.value)}
      />

      <textarea
        placeholder="Extra notes"
        value={form.extraInfo}
        onChange={(e) => update("extraInfo", e.target.value)}
      />

      <button type="submit" style={{ marginRight: 8 }}>
        Save & Regenerate
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
