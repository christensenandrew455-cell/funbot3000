'use client'; // ✅ THIS IS REQUIRED AT THE TOP

import { useState, Suspense } from 'react';

export default function Home() {
  const [formData, setFormData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    setFormData(data);
  };

  const handleReset = () => setFormData(null);

  // Results component inside the same file
  const Results = ({ data }) => {
    const [activity, setActivity] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch activity on mount
    React.useEffect(() => {
      async function fetchActivity() {
        setLoading(true);
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        setActivity(json.result || 'No activity found.');
        setLoading(false);
      }
      fetchActivity();
    }, [data]);

    if (loading) return <p>Generating activity...</p>;

    return (
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>Fun Activity</h2>
        <p>{activity.split('\n')[0]}</p>
        <details>
          <summary>Full Description</summary>
          <p>{activity}</p>
        </details>
        <button onClick={handleReset} style={{ marginTop: '10px', marginRight: '10px' }}>
          Update Information
        </button>
        <button onClick={() => window.location.reload()} style={{ marginTop: '10px' }}>
          Generate Again
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Hi, I'm FunBot 3000</h1>
      <p>Help me narrow down something fun for you</p>

      {!formData && (
        <form onSubmit={handleSubmit}>
          <label>
            How many people (optional):
            <input type="number" name="people" />
          </label>
          <br />
          <label>
            Age range (optional):
            <input type="number" name="ageMin" placeholder="Min" />
            <input type="number" name="ageMax" placeholder="Max" />
          </label>
          <br />
          <label>
            Personality (optional):
            <select name="personality">
              <option value="">--</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
            </select>
          </label>
          <br />
          <label>
            Location (optional):
            <input type="text" name="location" placeholder="City / State / Country" />
          </label>
          <br />
          <label>
            Activity type (optional):
            <select name="activityType">
              <option value="">--</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
              <option value="both">Both</option>
            </select>
          </label>
          <br />
          <label>
            Season (optional):
            <select name="season">
              <option value="">--</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
            </select>
          </label>
          <br />
          <label>
            Extra info (optional, max 100 chars):
            <textarea name="extraInfo" maxLength={100}></textarea>
          </label>
          <br />
          <button type="submit" style={{ marginTop: '10px' }}>
            Generate Activity
          </button>
        </form>
      )}

      {formData && (
        <Suspense fallback={<p>Generating activity...</p>}>
          <Results data={formData} />
        </Suspense>
      )}
    </div>
  );
}
