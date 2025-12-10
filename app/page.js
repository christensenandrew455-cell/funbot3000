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
  country: "",
  state: "",
  city: "",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activityData");
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);

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
      "country",
      "state",
      "city",
    ];
    return keys.some((k) => (form[k] ?? "") !== "");
  })();

  async function submitToApi(body) {
    const previousActivity =
      sessionStorage.getItem("previousActivity") || "";

    const finalBody = {
      ...body,
      previousActivity,
    };

    try {
      sessionStorage.setItem("activityData", JSON.stringify(finalBody));
    } catch {}

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalBody),
    });

    const data = await res.json();

    try {
      if (data.aiResult?.title) {
        sessionStorage.setItem("previousActivity", data.aiResult.title);
      }
      sessionStorage.setItem("aiResult", JSON.stringify(data.aiResult));
    } catch {}
  }

  async function handleGenerateRandom() {
    try {
      sessionStorage.setItem("activityData", JSON.stringify(null));
    } catch {}
    await submitToApi({});
    router.push("/results?rand=1");
  }

  async function handleGenerateActivity(e) {
    e.preventDefault();
    await submitToApi(form);
    router.push("/results");
  }

  // ---- UI STYLES ----
  const cardStyle = {
    background: "white",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    marginTop: 20,
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

  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 14,
    outline: "none",
  };

  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginTop: 10 }}>
        Fun Bot 3000 🎉
      </h1>

      {/* ACTION BAR */}
      <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={() => setPersonalizeOpen((v) => !v)}
          aria-expanded={personalizeOpen}
          style={buttonSecondary}
        >
          {personalizeOpen ? "Close" : "Personalize"}
        </button>

        {!personalizeOpen && (
          <button type="button" onClick={handleGenerateRandom} style={buttonPrimary}>
            Generate Random Activity
          </button>
        )}
      </div>

      {personalizeOpen && (
        <form onSubmit={handleGenerateActivity} style={cardStyle}>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={labelStyle}>
              Personality:
              <select
                style={inputStyle}
                value={form.personality}
                onChange={(e) => updateField("personality", e.target.value)}
              >
                <option value=""></option>
                <option value="extrovert">Extrovert</option>
                <option value="introvert">Introvert</option>
              </select>
            </label>

            <label style={labelStyle}>
              Inside / Outside:
              <select
                style={inputStyle}
                value={form.locationPref}
                onChange={(e) => updateField("locationPref", e.target.value)}
              >
                <option value=""></option>
                <option value="inside">Inside</option>
                <option value="outside">Outside</option>
                <option value="both">Both</option>
              </select>
            </label>

            <label style={labelStyle}>
              Season:
              <select
                style={inputStyle}
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

            <div style={{ display: "flex", gap: 10 }}>
              <input
                style={inputStyle}
                placeholder="Min age"
                value={form.minAge}
                onChange={(e) =>
                  updateField("minAge", e.target.value.replace(/\D/g, ""))
                }
              />
              <input
                style={inputStyle}
                placeholder="Max age"
                value={form.maxAge}
                onChange={(e) =>
                  updateField("maxAge", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>

            <input
              style={inputStyle}
              placeholder="Number of people"
              value={form.numPeople}
              onChange={(e) =>
                updateField("numPeople", e.target.value.replace(/\D/g, ""))
              }
            />

            <input
              style={inputStyle}
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />

            {form.country && (
              <input
                style={inputStyle}
                placeholder="State / Province"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            )}

            {form.state && (
              <input
                style={inputStyle}
                placeholder="City / Town"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            )}

            <textarea
              style={{ ...inputStyle, height: 80 }}
              placeholder="Anything extra (optional)"
              value={form.extraInfo}
              onChange={(e) => updateField("extraInfo", e.target.value)}
            />

            {anyPersonalizedInput ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" style={buttonPrimary}>
                  Generate Activity
                </button>
              </div>
            ) : (
              <div style={{ color: "#888", fontSize: 13 }}>
                Select or type something to enable “Generate activity”.
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
