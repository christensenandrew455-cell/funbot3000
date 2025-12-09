"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_FORM = {
  name: "",
  hobby: "",
  // personalization (all optional)
  personality: "", // "extrovert" | "introvert" | "both" | ""
  locationPref: "", // "outside" | "inside" | "both" | ""
  season: "", // e.g. "summer"
  minAge: "",
  maxAge: "",
  numPeople: "",
  place: "",
  country: "",
  state: "",
  city: "",
  extraInfo: "",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  // restore if user clicked "Edit" from results and we put data into sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activityData");
      if (saved) {
        setForm(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // save to sessionStorage on any change
  useEffect(() => {
    try {
      sessionStorage.setItem("activityData", JSON.stringify(form));
    } catch (e) {
      // ignore
    }
  }, [form]);

  function updateField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  const anyPersonalizedInput = (() => {
    // check if any personalization field has a non-empty value
    const keys = [
      "personality",
      "locationPref",
      "season",
      "minAge",
      "maxAge",
      "numPeople",
      "place",
      "country",
      "state",
      "city",
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
    return data;
  }

  async function handleGenerateRandom() {
    // clear personalization in-memory (but keep in sessionStorage? spec: random button present initially,
    //  if they later personalize it should be saved - we won't wipe sessionStorage here; just send little data)
    const body = { name: form.name || "", hobby: form.hobby || "" };
    const data = await submitToApi(body);
    // push to results — we'll pass nothing in query; results client will consult sessionStorage
    const params = new URLSearchParams();
    // include a marker for random generation
    params.set("rand", "1");
    router.push("/results?" + params.toString());
  }

  async function handleGenerateActivity(e) {
    e?.preventDefault?.();
    // ensure session storage holds the data (it already does via effect)
    // call API and navigate to results (results client will fetch based on sessionStorage)
    await submitToApi(form); // we don't need immediate response here because ResultsClient will call again
    router.push("/results");
  }

  // If user chooses a country that has states — for now treat United States as special
  const countryHasStates = form.country === "United States" || form.country === "USA" || form.country === "US";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1>Hi — I'm Fun Bot 3000 🎉</h1>

      <div style={{ marginTop: 12 }}>
        <input
          placeholder="Name (optional)"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginBottom: 8 }}
        />

        <input
          placeholder="Hobby (optional)"
          value={form.hobby}
          onChange={(e) => updateField("hobby", e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginBottom: 8 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setPersonalizeOpen((v) => !v)}
          aria-expanded={personalizeOpen}
          style={{ marginRight: 8 }}
        >
          Personalize
        </button>

        {/* Show "Generate random activity" unless personalize is open AND there are no personalization inputs */}
        {!personalizeOpen || (personalizeOpen && anyPersonalizedInput === false) ? (
          // If personalizeOpen==true and no inputs, random button should be hidden per spec.
          !personalizeOpen && (
            <button type="button" onClick={handleGenerateRandom}>
              Generate random activity
            </button>
          )
        ) : null}
      </div>

      {personalizeOpen && (
        <form onSubmit={handleGenerateActivity} style={{ marginTop: 18, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Personality:
              <select value={form.personality} onChange={(e) => updateField("personality", e.target.value)}>
                <option value="">(any)</option>
                <option value="extrovert">Extrovert</option>
                <option value="introvert">Introvert</option>
                <option value="both">Both / Balanced</option>
              </select>
            </label>

            <label>
              Inside / Outside:
              <select value={form.locationPref} onChange={(e) => updateField("locationPref", e.target.value)}>
                <option value="">(any)</option>
                <option value="outside">Outside</option>
                <option value="inside">Inside</option>
                <option value="both">Both</option>
              </select>
            </label>

            <label>
              Season:
              <select value={form.season} onChange={(e) => updateField("season", e.target.value)}>
                <option value="">(any)</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="autumn">Autumn/Fall</option>
                <option value="winter">Winter</option>
                <option value="all">All year</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Min age"
                value={form.minAge}
                onChange={(e) => updateField("minAge", e.target.value.replace(/\D/g, ""))}
              />
              <input
                placeholder="Max age"
                value={form.maxAge}
                onChange={(e) => updateField("maxAge", e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <input
              placeholder="Number of people (optional)"
              value={form.numPeople}
              onChange={(e) => updateField("numPeople", e.target.value.replace(/\D/g, ""))}
            />

            <input placeholder="Place you are at (optional)" value={form.place} onChange={(e) => updateField("place", e.target.value)} />

            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Country (type or select)" value={form.country} onChange={(e) => updateField("country", e.target.value)} />
              {countryHasStates && (
                <input placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              )}
            </div>

            <input placeholder="City / Town (text only)" value={form.city} onChange={(e) => updateField("city", e.target.value)} />

            <textarea
              placeholder="Anything extra you want to add or avoid (optional)"
              value={form.extraInfo}
              onChange={(e) => updateField("extraInfo", e.target.value)}
            />

            {/* Generate Activity button appears as soon as ANY personalization input is typed/selected (or always visible if you want it) */}
            {anyPersonalizedInput ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Generate activity</button>
                <button
                  type="button"
                  onClick={() => {
                    // clear personalization but keep name/hobby
                    setForm((f) => ({ ...DEFAULT_FORM, name: f.name, hobby: f.hobby }));
                    sessionStorage.removeItem("activityData");
                  }}
                >
                  Clear personalization
                </button>
              </div>
            ) : (
              <div style={{ color: "#555" }}>Type or select something to enable "Generate activity".</div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
