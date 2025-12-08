'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Results() {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    const params = Object.fromEntries([...searchParams.entries()]);
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
      .then(res => res.json())
      .then(data => {
        setActivity(data.result || '');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      {loading ? (
        <p>Generating activity...</p>
      ) : (
        <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
          <h2>Fun Activity</h2>
          <p>{activity.split('\n')[0]}</p>
          <details>
            <summary>Full Description</summary>
            <p>{activity}</p>
          </details>
        </div>
      )}
      <button style={{ marginRight: '10px' }} onClick={() => location.reload()}>
        Generate Again
      </button>
      <button onClick={() => location.href = '/'}>Update Information</button>
    </div>
  );
}
