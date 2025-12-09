// app/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    people: "",
    ageMin: "",
    ageMax: "",
    personality: "",
    location: "",
    activityType: "",
    season: "",
    extraInfo: ""
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      // Ensure we always have a result string
      const resultText = data?.result ?? "No activity generated.";

      // Build params — encode the result to keep it URL-safe
      const params = new URLSearchParams();

      // add inputs (only include non-empty values)
      Object.entries(formData).forEach(([k, v]) => {
        if (v != null && v !== "") params.set(k, v);
      });

      // include AI result (encoded)
      params.set("result", encodeURIComponent(resultText));

      router.push(`/results?${params.toString()}`);
    } catch (err) {
      console.error("Generate error:", err);
      alert("Error generating activity — check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Hi, I'm FunBot 3000</h1>
      <p>Help me narrow down something fun for you</p>

      <button onClick={() => setShowPersonalize((s) => !s)}>
        {showPersonalize ? "Hide Personalization Options" : "Personalize (optional)"}
      </button>

      {showPersonalize && (
        <div style={{ marginTop: "20px" }}>
          <label>
            How many people (optional):
            <input type="number" name="people" value={formData.people} onChange={handleChange} />
          </label>
          <br />
          <label>
            Age range (optional):
            <input type="number" name="ageMin" placeholder="Min" value={formData.ageMin} onChange={handleChange} />
            <input type="number" name="ageMax" placeholder="Max" value={formData.ageMax} onChange={handleChange} />
          </label>
          <br />
          <label>
            Introvert / Extrovert (optional):
            <select name="personality" value={formData.personality} onChange={handleChange}>
              <option value="">--</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
            </select>
          </label>
          <br />
          <label>
            Location (optional):
            <input type="text" name="location" placeholder="City / State / Country" value={formData.location} onChange={handleChange} />
          </label>
          <br />
          <label>
            Activity type (optional):
            <select name="activityType" value={formData.activityType} onChange={handleChange}>
              <option value="">--</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
              <option value="both">Both</option>
            </select>
          </label>
          <br />
          <label>
            Season (optional):
            <select name="season" value={formData.season} onChange={handleChange}>
              <option value="">--</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
            </select>
          </label>
          <br />
          <label>
            Additional info (optional, max 100 chars):
            <textarea name="extraInfo" maxLength={100} value={formData.extraInfo} onChange={handleChange}></textarea>
          </label>
          <br />
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ display: "inline-block", marginTop: "10px", padding: "8px 12px", background: "#0070f3", color: "white", border: "none", cursor: "pointer" }}
          >
            {loading ? "Generating..." : "Generate Activity"}
          </button>
        </div>
      )}
    </div>
  );
}
