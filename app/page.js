import React, { useState } from 'react';

export default function Funbot3000Home() {
  const [personality, setPersonality] = useState('');
  const [season, setSeason] = useState('');
  const [location, setLocation] = useState('');
  const [peopleCount, setPeopleCount] = useState('');
  const [age, setAge] = useState('');
  const [exclude, setExclude] = useState('');

  function sendInfo(e) {
    e.preventDefault();
    // Later this will be sent to AI — for now just log
    console.log({ personality, season, location, peopleCount, age, exclude });
  }

  function clearForm() {
    setPersonality('');
    setSeason('');
    setLocation('');
    setPeopleCount('');
    setAge('');
    setExclude('');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow p-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">Hi — I&apos;m <span className="text-indigo-600">Funbot 3000</span></h1>
          <div className="text-sm text-gray-500">Give me any info you want — all optional.</div>
        </header>

        <form onSubmit={sendInfo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Personality (optional)</label>
            <select value={personality} onChange={e => setPersonality(e.target.value)} className="w-full rounded-md border px-3 py-2">
              <option value="">No preference</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
              <option value="solo">Prefer solo</option>
              <option value="group">Prefer group</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Season (optional)</label>
            <select value={season} onChange={e => setSeason(e.target.value)} className="w-full rounded-md border px-3 py-2">
              <option value="">Any season</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="autumn">Autumn</option>
              <option value="winter">Winter</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">City / State (optional)</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">How many people? (optional)</label>
            <input
              value={peopleCount}
              onChange={e => setPeopleCount(e.target.value)}
              type="number"
              min="0"
              placeholder="0 = just you"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Age (optional)</label>
            <input
              value={age}
              onChange={e => setAge(e.target.value)}
              type="number"
              min="0"
              placeholder="Your age"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="block text-sm font-medium">Steer away from (optional)</label>
            <input
              value={exclude}
              onChange={e => setExclude(e.target.value)}
              placeholder="e.g. crowds, night, alcohol"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-3 col-span-1 md:col-span-2">
            <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow">Submit Info</button>
            <button type="button" onClick={clearForm} className="px-4 py-2 rounded-lg border">Clear</button>
          </div>
        </form>

        <footer className="mt-6 text-xs text-gray-400">Funbot 3000 — info first, AI magic later.</footer>
      </div>
    </main>
  );
}
