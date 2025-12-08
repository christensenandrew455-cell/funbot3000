'use client';

import { useState } from 'react';

export default function Results({ searchParams }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        <h2>Sample Activity</h2>
        <p>Quick description of the activity.</p>
        <details>
          <summary>Full description</summary>
          <p>Here is the detailed explanation of the activity. It goes into enough detail to understand fully how to do it, including steps and tips.</p>
        </details>
      </div>

      <button style={{ marginRight: '10px' }}>Generate Again</button>
      <button>Update Information</button>
    </div>
  );
}
