'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ResultsPage() {
  const searchParams = useSearchParams();

  // Convert query params → JS object
  const initialData = Object.fromEntries(searchParams.entries());

  // If no query params, no data yet
  const [formData, setFormData] = useState(
    Object.keys(initialData).length ? initialData : null
  );

  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch activity when formData exists
  useEffect(() => {
    if (!formData) return;

    async function fetchActivity() {
      setLoading(true);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      setActivity(json.result || 'No activity found.');
      setLoading(false);
    }

    fetchActivity();
  }, [formData]);

  // Reset everything + show form again
  const handleReset = () => {
    window.location.href = '/';
  };

  if (!formData) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>No information provided</h1>
        <p>Please return to the home page.</p>
        <button onClick={() => (window.location.href = '/')}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Your Fun Activity 🎉</h1>

      {loading && <p>Generating activity...</p>}

      {!loading && activity && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          marginTop: '20px', 
          borderRadius: '8px' 
        }}>
          <h2>Result</h2>

          {/* Short summary */}
          <p>{activity.split('\n')[0]}</p>

          <details style={{ marginTop: '10px' }}>
            <summary>Full Description</summary>
            <p style={{ marginTop: '10px' }}>
              {activity}
            </p>
          </details>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ marginRight: '10px', padding: '8px 12px' }}
            >
              Generate Again
            </button>

            <button
              onClick={handleReset}
              style={{ padding: '8px 12px' }}
            >
              Update Information
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
