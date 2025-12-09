"use client";
import { useSearchParams } from "next/navigation";

export default function ResultsPage() {
  const params = useSearchParams();

  const aiResult = params.get("aiResult");
  const name = params.get("name");
  const hobby = params.get("hobby");

  return (
    <div>
      <h1>Results</h1>

      <p><strong>Name:</strong> {name || "None"}</p>
      <p><strong>Hobby:</strong> {hobby || "None"}</p>

      <h2>AI Result:</h2>
      <p>{aiResult}</p>
    </div>
  );
}
