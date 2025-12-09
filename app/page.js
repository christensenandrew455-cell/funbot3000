"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_FORM = {
  personality: "",
  locationPref: "",
  season: "",
  minAge: "",
  maxAge: "",
  numPeople: "",
  extraInfo: "",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  // Restore saved data
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activityData");
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);

  // Save on change
  useEffect(() => {
    try {
      sessionStorage.setItem("activityData", JSON.stringify(form));
    } catch {}
  }, [form]);

  function updateField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  const anyPersonalizedInput = (() => {
    const keys = [
      "personality",
      "locationPref",
      "season",
      "minAge",
      "maxAge",
      "numPeople",
      "extraInfo",
    ];
    return keys.some((k) => (form[k] ?? "") !== "");
  })();

  async function submitToApi(body) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    sessionStorage.setItem("aiResult", JSON.stringify(data.aiResult));
  }

  async function handleGenerateRandom() {
    await submitToApi({});
    router.push("/results?rand=1");
  }

  async function handleGenerateActivity(e) {
    e.preventDefault();
    await submitToApi(form);
    router.push("/results");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1>Fun Bot 3000 🎉</h1>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setPersonalizeOpen((v) => !v)}
          aria-expanded={personalizeOpen}
          style={{ marginRight: 8 }}
        >
          Personalize
        </button>

        {!personalizeOpen && (
          <button type="button" onClick={handleGenerateRandom}>
            Generate random activity
          </button>
        )}
      </div>

      {personalizeOpen && (
        <form
          onSubmit={handleGenerateActivity}
          style={{
            marginTop: 18,
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {/* Personality */}
            <label>
              Personality:
              <select
                value={form.personality}
                onChange={(e) => updateField("personality", e.target.value)}
              >
                <option value=""></option>
                <option value="extrovert">Extrovert</option>
                <option value="introvert">Introvert</option>
              </select>
            </label>

            {/* Inside / Outside */}
            <label>
              Inside / Outside:
              <select
                value={form.locationPref}
                onChange={(e) => updateField("locationPref", e.target.value)}
              >
                <option value=""></option>
                <option value="inside">Inside</option>
                <option value="outside">Outside</option>
              </select>
            </label>

            {/* Season */}
            <label>
              Season:
              <select
                value={form.season}
                onChange={(e) => updateField("season", e.target.value)}
              >
                <option value=""></option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="autumn">Autumn/Fall</option>
                <option value="winter">Winter</option>
              </select>
            </label>

            {/* Age range */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Min age"
                value={form.minAge}
                onChange={(e) =>
                  updateField("minAge", e.target.value.replace(/\D/g, ""))
                }
              />
              <input
                placeholder="Max age"
                value={form.maxAge}
                onChange={(e) =>
                  updateField("maxAge", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>

            {/* Number of people */}
            <input
              placeholder="Number of people"
              value={form.numPeople}
              onChange={(e) =>
                updateField("numPeople", e.target.value.replace(/\D/g, ""))
              }
            />

            {/* Extra notes */}
            <textarea
              placeholder="Anything extra (optional)"
              value={form.extraInfo}
              onChange={(e) => updateField("extraInfo", e.target.value)}
            />

            {anyPersonalizedInput ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Generate activity</button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    sessionStorage.removeItem("activityData");
                  }}
                >
                  Clear personalization
                </button>
              </div>
            ) : (
              <div style={{ color: "#555" }}>
                Select or type something to enable "Generate activity".
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
