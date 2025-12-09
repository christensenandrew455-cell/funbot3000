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

  // load session storage data
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activityData");
      if (saved) setSessionData(JSON.parse(saved));
    } catch (e) {
      // ignore
    }
  }, []);

  // Clear sessionStorage completely when leaving page or closing tab (per your requirement)
  useEffect(() => {
    const handler = () => {
      try {
        sessionStorage.removeItem("activityData");
      } catch (e) {}
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      // also clear on unmount to be safe
      try {
        sessionStorage.removeItem("activityData");
      } catch (e) {}
    };
  }, []);

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
          setAiResult(null);
        } else {
          setAiResult(data.aiResult);
        }
      } catch (err) {
        setError(err?.message || "Fetch error");
        setAiResult(null);
      } finally {
        setLoading(false);
      }
    },
    [sessionData]
  );

  // initial fetch: if sessionData exists, call API using it; otherwise call API with nothing to generate random
  useEffect(() => {
    // If we have sessionData, fetch using it. Otherwise, fetch with empty body so server returns random
    const qRand = params.get("rand");
    const body = sessionData ? sessionData : {};
    // If rand param is set, do not include personalization
    if (qRand) {
      fetchAi({});
    } else {
      fetchAi(body);
    }
  }, [sessionData, params, fetchAi]);

  async function handleGenerateAgain() {
    await fetchAi(sessionData ?? {});
    setShowLong(false);
  }

  function handleEditData() {
    // keep session storage (it's already there). We'll navigate back to home where data is prefilled.
    router.push("/");
  }

  function handleClearAll() {
    sessionStorage.removeItem("activityData");
    setSessionData(null);
    // reload page so it renders the form state
    router.refresh();
  }

  if (loading) return <div>Loading activity...</div>;
  if (error) return <div>Error: {error}</div>;

  // If aiResult is structured with title/short/long, use those; otherwise fall back to raw text
  const title = aiResult?.title || (typeof aiResult === "string" ? "Activity" : "");
  const short = aiResult?.short || (typeof aiResult === "string" ? aiResult.slice(0, 120) : "");
  const long = aiResult?.long || (typeof aiResult === "string" ? aiResult : "");

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
          Don't like the activity? Generate again
        </button>

        {/* If sessionData exists show edit & clear options */}
        {sessionData ? (
          <>
            <button onClick={handleEditData} style={{ marginRight: 8 }}>
              Edit data
            </button>
            <button onClick={handleClearAll}>Clear all</button>
          </>
        ) : (
          <div style={{ marginTop: 12 }}>
            {/* If there is no sessionData render a small personalize form so the user can generate with options */}
            <p>Want to personalize? Fill any fields below and press Generate activity.</p>

            <SimplePersonalizeForm
              onSave={(data) => {
                // Save into sessionStorage and regenerate results
                sessionStorage.setItem("activityData", JSON.stringify(data));
                setSessionData(data);
                fetchAi(data);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Small inline personalization form used when there's no session data on the results page.
 * Keeps parity with the home controls but minimal.
 */
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
      style={{ marginTop: 8, border: "1px solid #eee", padding: 8, borderRadius: 6 }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <select value={state.personality} onChange={(e) => update("personality", e.target.value)}>
          <option value="">Personality (any)</option>
          <option value="extrovert">Extrovert</option>
          <option value="introvert">Introvert</option>
          <option value="both">Both</option>
        </select>

        <select value={state.locationPref} onChange={(e) => update("locationPref", e.target.value)}>
          <option value="">Inside / Outside (any)</option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
          <option value="both">Both</option>
        </select>

        <select value={state.season} onChange={(e) => update("season", e.target.value)}>
          <option value="">Season (any)</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>

        <input placeholder="Number of people" value={state.numPeople} onChange={(e) => update("numPeople", e.target.value.replace(/\D/g, ""))} />

        <textarea placeholder="Extra notes" value={state.extraInfo} onChange={(e) => update("extraInfo", e.target.value)} />

        <div>
          <button type="submit">Generate activity</button>
        </div>
      </div>
    </form>
  );
}
