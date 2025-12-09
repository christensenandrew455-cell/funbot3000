"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showPersonalize, setShowPersonalize] = useState(false);
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleGenerate() {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    // Redirect with EVERYTHING in the URL
    const params = new URLSearchParams({
      ...formData,
      result: data.result,
    });

    router.push(`/results?${params.toString()}`);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Hi, I'm FunBot 3000</h1>
      <p>Help me narrow down something fun for you</p>

      <button onClick={() => setShowPersonalize(!showPersonalize)}>
        {showPersonalize ? "Hide Personalization Options" : "Personalize (optional)"}
      </button>

      {showPersonalize && (
        <div style={{ marginTop: "20px" }}>
          {Object.keys(formData).map((key) => (
            key !== "extraInfo" ? (
              <div key={key}>
                <label>
                  {key}:
                  <input
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                  />
                </label>
                <br />
              </div>
            ) : (
              <label key={key}>
                Additional info:
                <textarea
                  name="extraInfo"
                  maxLength={100}
                  value={formData.extraInfo}
                  onChange={handleChange}
                />
              </label>
            )
          ))}

          <button
            onClick={handleGenerate}
            style={{
              display: "inline-block",
              marginTop: "10px",
              padding: "5px 10px",
              background: "#0070f3",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Generate Activity
          </button>
        </div>
      )}
    </div>
  );
}
