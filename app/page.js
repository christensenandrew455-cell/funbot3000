'use client';

import { useState } from 'react';

export default function Home() {
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [formData, setFormData] = useState({
    people: '',
    ageMin: '',
    ageMax: '',
    personality: '',
    location: '',
    activityType: '',
    season: '',
    extraInfo: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Hi, I'm FunBot 3000</h1>
      <p>Help me narrow down something fun for you</p>

      <button onClick={() => setShowPersonalize(!showPersonalize)}>
        {showPersonalize ? 'Hide Personalization Options' : 'Personalize (optional)'}
      </button>

      {showPersonalize && (
        <div style={{ marginTop: '20px' }}>
          <label>
            How many people (optional):
            <input type="number" name="people" value={formData.people} onChange={handleChange} />
          </label>
          <br />
          <label>
            Age range (optional):
            <input type="number" name="ageMin" placeholder="Min" value={formData.ageMin} onChange={handleChange} />
            <input type="number" name="ageMax" placeholder="Max" value={formData.ageMax} onChange={handleChange} />
          </label>
          <br />
          <label>
            Introvert / Extrovert (optional):
            <select name="personality" value={formData.personality} onChange={handleChange}>
              <option value="">--</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
            </select>
          </label>
          <br />
          <label>
            Location (optional):
            <input type="text" name="location" placeholder="City / State / Country" value={formData.location} onChange={handleChange} />
          </label>
          <br />
          <label>
            Activity type (optional):
            <select name="activityType" value={formData.activityType} onChange={handleChange}>
              <option value="">--</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
              <option value="both">Both</option>
            </select>
          </label>
          <br />
          <label>
            Season (optional):
            <select name="season" value={formData.season} onChange={handleChange}>
              <option value="">--</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
            </select>
          </label>
          <br />
          <label>
            Additional info (optional, max 100 chars):
            <textarea name="extraInfo" maxLength={100} value={formData.extraInfo} onChange={handleChange}></textarea>
          </label>
          <br />
          <a
            href={`/results?${new URLSearchParams(formData).toString()}`}
            style={{ display: 'inline-block', marginTop: '10px', padding: '5px 10px', background: '#0070f3', color: 'white', textDecoration: 'none' }}
          >
            Generate Activity
          </a>
        </div>
      )}
    </div>
  );
}
