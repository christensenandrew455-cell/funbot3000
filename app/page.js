"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_FORM = {
  personality: "",
  locationPref: "",
  season: "",
  ageCategory: "",
  groupSize: "",
  chaos: "normal",
  cityType: "",
  extraInfo: "",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

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
      maxWidth: 400,
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
    expandButton: {
      marginTop: 12,
      background: "none",
      border: "none",
      color: "#4A6CF7",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
  };

  return (
    <div style={styles.container}>
      {/* Main Card */}
      <div style={styles.card}>
        <h1 style={{ fontSize: 36, fontWeight: 800, textAlign: "center" }}>
          Fun Bot 3000 🎉
        </h1>
        <p style={{ textAlign: "center", color: "#555", fontSize: 18 }}>
          Discover fun activities personalized for you or generate a random one instantly!
        </p>

        <div style={styles.centerButtons}>
          <button
            onClick={() => setPersonalizeOpen((v) => !v)}
            style={styles.buttonSecondary}
          >
            {personalizeOpen ? "Close Personalization" : "Personalize"}
          </button>

          {!personalizeOpen && (
            <button onClick={handleGenerateRandom} style={styles.buttonPrimary}>
              {loading ? "Generating..." : "Generate Random Activity"}
            </button>
          )}
        </div>

        {personalizeOpen && (
          <form style={styles.personalizeCard} onSubmit={handleGenerateActivity}>
            <div style={{ display: "grid", gap: 14 }}>
              {["personality","locationPref","season","ageCategory","groupSize","chaos","cityType"].map((key) => {
                const labels = {
                  personality: "Personality",
                  locationPref: "Inside / Outside",
                  season: "Season",
                  ageCategory: "Age Category",
                  groupSize: "Group Size",
                  chaos: "Chaos Level",
                  cityType: "Location Type",
                };
                const options = {
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
                    {labels[key]}
                    <select
                      style={styles.input}
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                    >
                      {options[key].map((o, i) => (
                        <option key={i} value={o.toLowerCase().replace(/\s|\(|\)/g,"")}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </form>
        )}
      </div>

      {/* Learn More */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Learn More</h2>

        <p style={styles.sectionContent}>
          Fun Bot 3000 is an AI-powered activity generator that helps you instantly
          discover fun, creative, and personalized activities—or surprise yourself
          with something completely random.
        </p>

        {learnMoreOpen && (
          <p style={{ ...styles.sectionContent, marginTop: 16 }}>
            Fun Bot 3000 is designed to make finding things to do effortless for anyone,
            regardless of age, location, or group size. At its core, the app uses artificial
            intelligence to generate activity ideas either completely at random or based
            on preferences you choose to provide. This flexibility allows users to explore
            new ideas without thinking too hard, while still having the option to fine-tune
            results when they want something more specific.

            <br /><br />
            The personalization system allows you to guide the AI using several simple
            options. Personality helps determine whether activities should be more social,
            more independent, or somewhere in between. Inside or outside preferences ensure
            suggestions match your environment or mood, while the season setting prevents
            unrealistic ideas such as outdoor summer activities in winter.

            <br /><br />
            Age category helps tailor activities to kids, teenagers, adults, or mixed-age
            groups. Group size ensures suggestions work for solo experiences, small groups,
            or larger gatherings. Chaos level controls intensity, ranging from calm and
            relaxing to thrilling and high-energy. Finally, location type helps the AI
            suggest activities that realistically fit whether you live in a city or a town.

            <br /><br />
            All personalization options are completely optional. If you choose not to fill
            anything out, Fun Bot 3000 will still generate creative activities at random.
            With unlimited generations and an intuitive interface, the app is built to
            inspire, entertain, and help you break out of routine with minimal effort.
          </p>
        )}

        <button
          style={styles.expandButton}
          onClick={() => setLearnMoreOpen((v) => !v)}
        >
          {learnMoreOpen ? "Show less" : "Read more"}
        </button>
      </div>
    </div>
  );
}
