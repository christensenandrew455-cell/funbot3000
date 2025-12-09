"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", hobby: "" });

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!data.aiResult) {
      alert("No AI result received");
      return;
    }

    // Redirect to results page with query params
    const params = new URLSearchParams({
      aiResult: data.aiResult,
      name: form.name,
      hobby: form.hobby,
    });

    router.push("/results?" + params.toString());
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Name (optional)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Hobby (optional)"
        value={form.hobby}
        onChange={(e) => setForm({ ...form, hobby: e.target.value })}
      />
      <button type="submit">Generate</button>
    </form>
  );
}
