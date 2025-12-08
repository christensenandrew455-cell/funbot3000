'use client';

import { useState } from 'react';

export default function Home() {
  const [showPersonalize, setShowPersonalize] = useState(false);

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
            Introvert / Extrovert (optional):
            <select name="personality">
              <option value="">--</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
            </select>
          </label>
          <br />
          <label>
            Location (Country / State / City) (optional):
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
            Additional info (optional, max 100 chars):
            <textarea name="extraInfo" maxLength={100}></textarea>
          </label>
          <br />
        </div>
      )}

      <form action="/api/generate" method="POST" style={{ marginTop: '20px' }}>
        <button type="submit">Generate Activity</button>
      </form>
    </div>
  );
}
