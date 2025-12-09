"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResultsClient() {
  const params = useSearchParams();

  const season = params.get("season");
  const personality = params.get("personality");
  const people = params.get("people");
  const location = params.get("location");
  const activityType = params.get("activityType");
  const extraInfo = params.get("extraInfo");

  const [result, setResult] = useState(null);

  useEffect(() => {
    async function go() {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          personality,
          people,
          location,
          activityType,
          extraInfo,
        }),
      });

      const data = await res.json();
      setResult(data.aiResult ?? "No AI result.");
    }

    go();
  }, []);

  return (
    <div>
      <h1>Activity Result</h1>
      <pre>{result ?? "Loading..."}</pre>
    </div>
  );
}
