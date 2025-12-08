"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  const [form, setForm] = useState({
    peopleCount: "",
    ageMin: "",
    ageMax: "",
    personality: "", // "introvert" or "extrovert"
    country: "",
    state: "",
    city: "",
    activityLocation: "both", // inside / outside / both
    season: "",
    note: ""
  });

  // list of countries (small for demo). Country-specific fields shown conditionally.
  const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "India", "Other"];
  const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI",
    "MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
    "VT","VA","WA","WV","WI","WY"
  ];

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function filterList(q, list) {
    const s = (q || "").toLowerCase();
    return list.filter(i => i.toLowerCase().includes(s));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // store the form for the results page to reuse/update
    sessionStorage.setItem("funbot3000_form", JSON.stringify(form));

    // call API
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = await res.json();

    // store result for results page
    sessionStorage.setItem("funbot3000_result", JSON.stringify(body));
    router.push("/results");
  }

  return (
    <div style={{ maxWidth: 880, margin: "36px auto", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.08)", padding: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a" }}>
          Hi — I'm <span style={{ color: "#7c3aed" }}>Funbot 3000</span>
        </h1>
        <p style={{ color: "#475569", marginTop: 8 }}>Help me narrow down something fun for you.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
          {/* How many people */}
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            How many people <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.peopleCount}
            onChange={(e) => updateField("peopleCount", e.target.value)}
            placeholder="0 = just you"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 14 }}
          />

          {/* Age min / max */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Youngest age <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.ageMin}
                onChange={(e) => updateField("ageMin", e.target.value)}
                placeholder="e.g. 5"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Oldest age <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.ageMax}
                onChange={(e) => updateField("ageMax", e.target.value)}
                placeholder="e.g. 99"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>
          </div>

          {/* Introvert / Extrovert */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              Introvert or Extrovert <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="personality"
                  checked={form.personality === "introvert"}
                  onChange={() => updateField("personality", "introvert")}
                />
                Introvert
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="personality"
                  checked={form.personality === "extrovert"}
                  onChange={() => updateField("personality", "extrovert")}
                />
                Extrovert
              </label>
            </div>
          </div>

          {/* Personalize toggle */}
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setPersonalizeOpen(p => !p)}
              style={{
                background: "none",
                border: "1px dashed #c7d2fe",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
                color: "#3730a3",
                fontWeight: 700
              }}
            >
              {personalizeOpen ? "Hide personalization (all optional)" : "Personalize (optional) — show more options"}
            </button>
          </div>

          {/* Personalize fields */}
          {personalizeOpen && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, border: "1px solid #e6eef8", background: "#fcfcff" }}>
              {/* Country (searchable small control) */}
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Country <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
              </label>
              <CountrySelector value={form.country} onChange={(v) => { updateField("country", v); updateField("state", ""); }} />

              {/* State (if United States) */}
              {form.country === "United States" && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    State <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                  >
                    <option value="">Choose a state (optional)</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* City */}
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Town / City <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                </label>
                <input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Austin"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>

              {/* Inside / Outside / Both */}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Inside / Outside / Both <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                </label>
                <select
                  value={form.activityLocation}
                  onChange={(e) => updateField("activityLocation", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                >
                  <option value="both">Both</option>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                </select>
              </div>

              {/* Season */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Season <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                </label>
                <select
                  value={form.season}
                  onChange={(e) => updateField("season", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                >
                  <option value="">Any</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="autumn">Autumn</option>
                  <option value="winter">Winter</option>
                </select>
              </div>

              {/* Short note */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Quick note (max 100 chars) <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                </label>
                <input
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value.slice(0, 100))}
                  placeholder="Anything to avoid or prefer (100 chars max)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{form.note.length}/100</div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                background: "#7c3aed",
                color: "#fff",
                fontWeight: 700,
                padding: "12px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer"
              }}
            >
              Generate activity
            </button>

            <button
              type="button"
              onClick={() => {
                // clear form and storage
                setForm({
                  peopleCount: "",
                  ageMin: "",
                  ageMax: "",
                  personality: "",
                  country: "",
                  state: "",
                  city: "",
                  activityLocation: "both",
                  season: "",
                  note: ""
                });
                sessionStorage.removeItem("funbot3000_form");
                sessionStorage.removeItem("funbot3000_result");
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----- small CountrySelector inline component (keeps everything in this file as you requested) ----- */
function CountrySelector({ value, onChange }) {
  const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "India", "Germany", "France", "Other"];
  const [query, setQuery] = useState("");

  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <input
        placeholder="Search country..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }}
      />
      <div style={{ maxHeight: 140, overflow: "auto", borderRadius: 8 }}>
        <select
          value={value}
          onChange={(e) => { onChange(e.target.value); setQuery(""); }}
          size={Math.min(6, filtered.length || 1)}
          style={{ width: "100%", padding: 8, borderRadius: 8 }}
        >
          {filtered.length === 0 && <option value="">No matches</option>}
          {filtered.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}
