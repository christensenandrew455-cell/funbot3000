export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Hi, I'm FunBot 3000</h1>
      <p>Help me narrow down something fun for you</p>
      <form action="/app/api/generate/route.js" method="POST">
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
        <button type="submit">Generate Activity</button>
      </form>
    </div>
  );
}
