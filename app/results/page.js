export default function Results({ searchParams }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Activity Name</h1>
      <p>Quick description here...</p>
      <details>
        <summary>Full description</summary>
        <p>Here is the detailed activity description...</p>
      </details>
      <button>Generate Again</button>
      <button>Update Information</button>
    </div>
  );
}
