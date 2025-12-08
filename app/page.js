"use client";

import { useState } from "react";

export default function HomePage() {
  const [form, setForm] = useState({
    introvertExtrovert: "",
    season: "",
    city: "",
    state: "",
    peopleCount: "",
    ageRange: "",
    avoid: ""
  });

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log("User info:", form);

    // This is where you will send to AI later:
    // await fetch("/api/generate", {...})

    alert("Info collected! (AI processing not hooked up yet.)");
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow">
      <h1 className="text-3xl font-bold text-center mb-6">
        Hi, I'm Funbot 3000 🤖
      </h1>

      <p className="text-center mb-4 text-gray-600">
        Tell me anything you want — or nothing!  
        The more you share, the more personalized the activity will be.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        <select
          className="w-full p-2 border rounded"
          value={form.introvertExtrovert}
          onChange={(e) => updateField("introvertExtrovert", e.target.value)}
        >
          <option value="">Introvert or Extrovert? (optional)</option>
          <option value="introvert">Introvert</option>
          <option value="extrovert">Extrovert</option>
        </select>

        <select
          className="w-full p-2 border rounded"
          value={form.season}
          onChange={(e) => updateField("season", e.target.value)}
        >
          <option value="">Season (optional)</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
        </select>

        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="City (optional)"
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
        />

        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="State (optional)"
          value={form.state}
          onChange={(e) => updateField("state", e.target.value)}
        />

        <input
          type="number"
          className="w-full p-2 border rounded"
          placeholder="How many people? (optional)"
          value={form.peopleCount}
          onChange={(e) => updateField("peopleCount", e.target.value)}
        />

        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="Age range? (optional)"
          value={form.ageRange}
          onChange={(e) => updateField("ageRange", e.target.value)}
        />

        <textarea
          className="w-full p-2 border rounded"
          placeholder="Anything you want Funbot to avoid? (optional)"
          value={form.avoid}
          onChange={(e) => updateField("avoid", e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold"
        >
          Send to AI
        </button>
      </form>
    </div>
  );
}
