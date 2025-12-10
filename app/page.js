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
      maxWidth: 720,
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
    input: {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #ddd",
      fontSize: 14,
      outline: "none",
      transition: "0.2s",
    },
    label: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontSize: 14,
      fontWeight: 600,
    },
    centerButtons: {
      display: "flex",
      justifyContent: "center",
      gap: 16,
      marginTop: 24,
      flexWrap: "wrap",
    },
    tagline: {
      textAlign: "center",
      color: "#555",
      marginTop: 8,
      fontSize: 18,
    },
    section: {
      marginTop: 40,
      maxWidth: 720,
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
    },
    sectionContent: {
      fontSize: 15,
      color: "#555",
      lineHeight: 1.6,
    },
    footer: {
      marginTop: 40,
      padding: "20px 10px",
      textAlign: "center",
      fontSize: 14,
      color: "#555",
      borderTop: "1px solid #ddd",
    },
    footerLink: {
      color: "#4A6CF7",
      textDecoration: "none",
      fontWeight: 500,
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

        {/* Personalization Form */}
        {personalizeOpen && (
          <form style={{ ...styles.card, marginTop: 20 }} onSubmit={handleGenerateActivity}>
            <div style={{ display: "grid", gap: 14 }}>
              <label style={styles.label}>
                Personality:
                <select
                  style={styles.input}
                  value={form.personality}
                  onChange={(e) => updateField("personality", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="extrovert">Extrovert</option>
                  <option value="introvert">Introvert</option>
                </select>
              </label>

              <label style={styles.label}>
                Inside / Outside:
                <select
                  style={styles.input}
                  value={form.locationPref}
                  onChange={(e) => updateField("locationPref", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                  <option value="both">Both</option>
                </select>
              </label>

              <label style={styles.label}>
                Season:
                <select
                  style={styles.input}
                  value={form.season}
                  onChange={(e) => updateField("season", e.target.value)}
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
                  style={styles.input}
                  placeholder="Min age"
                  value={form.minAge}
                  onChange={(e) =>
                    updateField("minAge", e.target.value.replace(/\D/g, ""))
                  }
                />
                <input
                  style={styles.input}
                  placeholder="Max age"
                  value={form.maxAge}
                  onChange={(e) =>
                    updateField("maxAge", e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <input
                style={styles.input}
                placeholder="Number of people"
                value={form.numPeople}
                onChange={(e) =>
                  updateField("numPeople", e.target.value.replace(/\D/g, ""))
                }
              />

              <input
                style={styles.input}
                placeholder="Country"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
              />

              {form.country && (
                <input
                  style={styles.input}
                  placeholder="State / Province"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              )}

              {form.state && (
                <input
                  style={styles.input}
                  placeholder="City / Town"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              )}

              <textarea
                style={{ ...styles.input, height: 80, resize: "none" }}
                placeholder="Anything extra (optional)"
                value={form.extraInfo}
                onChange={(e) => updateField("extraInfo", e.target.value)}
              />

              {anyPersonalizedInput ? (
                <button type="submit" style={styles.buttonPrimary}>
                  {loading ? "Generating..." : "Generate Activity"}
                </button>
              ) : (
                <div style={{ color: "#888", fontSize: 13 }}>
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
          Fun Bot 3000 is designed to help you discover fun activities instantly.
          You can either generate random suggestions or personalize them according to your preferences, location, season, and more.
        </p>
      </div>

      {/* FAQ Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>FAQ</h2>
        <p style={styles.sectionContent}>
          <strong>Q: Is it free?</strong> <br /> Yes, Fun Bot 3000 is completely free to use. <br /><br />
          <strong>Q: Do you keep my data?</strong> <br /> No, Your data is only stored breifly and safley until you close the site in witch it is deleted. <br /><br />
          <strong>Q: Where can I find other cool apps?</strong> <br />
          All right here:{" "}
          <a href="https://thetestifyai.com" target="_blank" rel="noopener noreferrer">
            TheTestifyAI
          </a>{" "}
          and{" "}
          <a href="https://ratemyroutine.com" target="_blank" rel="noopener noreferrer">
            RateMyRoutine
          </a>.
        </p>
      </div>
    </div>
  );  
}
