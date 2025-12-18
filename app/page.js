"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_FORM = {
  personality: "",
  locationPref: "",
  season: "",
  ageCategory: "", // kids, teenagers, adults, mixed
  groupSize: "",   // solo, 2-4, group
  chaos: "normal", // normal, getting there, crazy
  cityType: "",    // city or town
  extraInfo: "",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("activityData");
    if (saved) setForm(JSON.parse(saved));
  }, []);

  useEffect(() => {
    sessionStorage.setItem("activityData", JSON.stringify(form));
  }, [form]);

  const anyPersonalizedInput = Object.values(form).some((v) => v !== "");

  function updateField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function submitToApi(body) {
    setLoading(true);
    const previousActivity = sessionStorage.getItem("previousActivity") || "";
    const finalBody = { ...body, previousActivity };

    sessionStorage.setItem("activityData", JSON.stringify(finalBody));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalBody),
      });
      const data = await res.json();

      if (data.aiResult?.title) {
        sessionStorage.setItem("previousActivity", data.aiResult.title);
      }
      sessionStorage.setItem("aiResult", JSON.stringify(data.aiResult));
    } catch (err) {
      console.error("API error:", err);
      alert("Failed to generate activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRandom() {
    sessionStorage.setItem("activityData", JSON.stringify(null));
    await submitToApi({});
    router.push("/results?rand=1");
  }

  async function handleGenerateActivity(e) {
    e.preventDefault();
    await submitToApi(form);
    router.push("/results");
  }

  // ---- UI STYLES ----
  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: 20,
      background: "linear-gradient(to right, #f0f4ff, #ffffff)",
      fontFamily: "'Inter', sans-serif",
    },
    card: {
      background: "white",
      padding: 24,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      marginTop: 20,
      width: "100%",
      maxWidth: 480,
    },
    personalizeCard: {
      background: "white",
      padding: 20,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      marginTop: 20,
      width: "100%",
      maxWidth: 400, // increased from 360
      marginLeft: "auto",
      marginRight: "auto",
      boxSizing: "border-box",
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
      maxWidth: 200,
      textAlign: "center",
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
      maxWidth: 200,
      textAlign: "center",
    },
    centerButtons: {
      display: "flex",
      justifyContent: "center",
      gap: 16,
      marginTop: 24,
      flexWrap: "wrap",
    },
    input: {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #ddd",
      fontSize: 14,
      outline: "none",
      transition: "0.2s",
      textAlign: "center",
      boxSizing: "border-box",
    },
    label: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontSize: 14,
      fontWeight: 600,
      alignItems: "center",
    },
    section: {
      marginTop: 40,
      maxWidth: 480,
      width: "100%",
      background: "white",
      padding: 24,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 12,
      textAlign: "center",
    },
    sectionContent: {
      fontSize: 15,
      color: "#555",
      lineHeight: 1.6,
      textAlign: "center",
    },
    tagline: {
      textAlign: "center",
      color: "#555",
      marginTop: 8,
      fontSize: 18,
    },
    submitContainer: {
      display: "flex",
      justifyContent: "center",
      marginTop: 10,
    },
  };

  return (
    <div style={styles.container}>
      {/* Main Card */}
      <div style={styles.card}>
        <h1 style={{ fontSize: 36, fontWeight: 800, textAlign: "center" }}>
          Fun Bot 3000 🎉
        </h1>
        <p style={styles.tagline}>
          Discover fun activities personalized for you or generate a random one instantly!
        </p>

        {/* ACTION BAR */}
        <div style={styles.centerButtons}>
          <button
            type="button"
            onClick={() => setPersonalizeOpen((v) => !v)}
            aria-expanded={personalizeOpen}
            style={styles.buttonSecondary}
          >
            {personalizeOpen ? "Close Personalization" : "Personalize"}
          </button>

          {!personalizeOpen && (
            <button
              type="button"
              onClick={handleGenerateRandom}
              style={styles.buttonPrimary}
            >
              {loading ? "Generating..." : "Generate Random Activity"}
            </button>
          )}
        </div>

        {/* PERSONALIZATION FORM */}
        {personalizeOpen && (
          <form style={styles.personalizeCard} onSubmit={handleGenerateActivity}>
            <div style={{ display: "grid", gap: 14 }}>
              {["personality","locationPref","season","ageCategory","groupSize","chaos","cityType"].map((key) => {
                const labelMap = {
                  personality: "Personality",
                  locationPref: "Inside / Outside",
                  season: "Season",
                  ageCategory: "Age Category",
                  groupSize: "Group Size",
                  chaos: "Chaos Level",
                  cityType: "Location Type",
                };
                const optionsMap = {
                  personality: ["Select...","Extrovert","Introvert"],
                  locationPref: ["Select...","Inside","Outside","Both"],
                  season: ["Select...","Spring","Summer","Autumn/Fall","Winter"],
                  ageCategory: ["Select...","Kids","Teenagers","Adults","Mixed"],
                  groupSize: ["Select...","Solo (1)","2-4","Group (5+)"],
                  chaos: ["Normal","Getting There","Crazy"],
                  cityType: ["Select...","City","Town"],
                };
                return (
                  <label key={key} style={styles.label}>
                    {labelMap[key]}:
                    <select
                      style={styles.input}
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                    >
                      {optionsMap[key].map((opt,i) => (
                        <option key={i} value={opt.toLowerCase().replace(/\s|\(|\)/g,'')}>{opt}</option>
                      ))}
                    </select>
                  </label>
                )
              })}

              <textarea
                style={{ ...styles.input, height: 60, resize: "none", boxSizing: "border-box" }}
                placeholder="Anything extra (optional)"
                value={form.extraInfo}
                onChange={(e) => updateField("extraInfo", e.target.value)}
              />

              {anyPersonalizedInput ? (
                <div style={styles.submitContainer}>
                  <button type="submit" style={styles.buttonPrimary}>
                    {loading ? "Generating..." : "Generate Activity"}
                  </button>
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: 13, textAlign: "center" }}>
                  Fill in any field to enable “Generate Activity”.
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Learn More Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Learn More</h2>
        <p style={styles.sectionContent}>
          Fun Bot 3000 helps you instantly discover fun activities!
        </p>
      </div>

      {/* FAQ */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>FAQ</h2>
        <p style={styles.sectionContent}>
          <strong>Q: Where can I find other cool apps?</strong> <br />
          All right here:{" "}
          <a href="https://thetestifyai.com" target="_blank">TheTestifyAI</a> and{" "}
          <a href="https://ratemyroutine.com" target="_blank">RateMyRoutine</a>.
        </p>
      </div>
    </div>
  );
}

