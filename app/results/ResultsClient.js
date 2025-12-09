"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResultsClient() {
  const params = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [showLong, setShowLong] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState("");

  // Load session data
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activityData");
      if (saved) setSessionData(JSON.parse(saved));
    } catch {}
  }, []);

  // Clear on unload or unmount
  useEffect(() => {
    const handler = () => {
      try {
        sessionStorage.removeItem("activityData");
      } catch {}
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      try {
        sessionStorage.removeItem("activityData");
      } catch {}
    };
  }, []);

  // Fetch function
  const fetchAi = useCallback(
    async (body) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? sessionData ?? {}),
        });

        const data = await res.json();
        if (!data?.aiResult) {
          setError("No AI result returned.");
        } else {
          setAiResult(data.aiResult);
        }
      } catch (err) {
        setError(err?.message || "Fetch error");
      } finally {
        setLoading(false);
      }
    },
    [sessionData]
  );

  // Initial fetch
  useEffect(() => {
    const qRand = params.get("rand");
    if (qRand) {
      fetchAi({});
    } else {
      fetchAi(sessionData ?? {});
    }
  }, [sessionData, params, fetchAi]);

  async function handleGenerateAgain() {
    await fetchAi(sessionData ?? {});
    setShowLong(false);
  }

  function handleEditData() {
    // Do NOT navigate. Edit right here.
    setSessionData(sessionData || {});
  }

  function handleClearAll() {
    sessionStorage.removeItem("activityData");
    setSessionData(null);
    router.refresh();
  }

  if (loading) return <div>Loading activity...</div>;
  if (error) return <div>Error: {error}</div>;

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

        {sessionData ? (
          <>
            <button onClick={handleEditData} style={{ marginRight: 8 }}>
              Edit data
            </button>
            <button onClick={handleClearAll}>Clear all</button>
          </>
        ) : (
          <SimplePersonalizeForm
            onSave={(data) => {
              sessionStorage.setItem("activityData", JSON.stringify(data));
              setSessionData(data);
              fetchAi(data);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SimplePersonalizeForm({ onSave }) {
  const [state, setState] = useState({
    personality: "",
    locationPref: "",
    season: "",
    numPeople: "",
    extraInfo: "",
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
        <select
          value={state.personality}
          onChange={(e) => update("personality", e.target.value)}
        >
          <option value=""></option>
          <option value="extrovert">Extrovert</option>
          <option value="introvert">Introvert</option>
        </select>

        <select
          value={state.locationPref}
          onChange={(e) => update("locationPref", e.target.value)}
        >
          <option value=""></option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
        </select>

        <select
          value={state.season}
          onChange={(e) => update("season", e.target.value)}
        >
          <option value=""></option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>

        <input
          placeholder="Number of people"
          value={state.numPeople}
          onChange={(e) =>
            update("numPeople", e.target.value.replace(/\D/g, ""))
          }
        />

        <textarea
          placeholder="Extra notes"
          value={state.extraInfo}
          onChange={(e) => update("extraInfo", e.target.value)}
        />

        <button type="submit">Generate activity</button>
      </div>
    </form>
  );
}
