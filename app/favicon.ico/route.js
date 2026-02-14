export const runtime = "nodejs";

export function GET() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <!-- Background -->
    <rect width="64" height="64" rx="14" fill="#ffffff"/>

    <!-- Big A -->
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-size="42" font-weight="900" fill="#2563eb"
      font-family="Arial, Helvetica, sans-serif">
      A
    </text>

    <!-- Magnifying glass -->
    <circle cx="42" cy="42" r="12"
      stroke="#0f172a" stroke-width="3"
      fill="rgba(255,255,255,0.85)"/>

    <!-- Handle -->
    <line x1="50" y1="50" x2="58" y2="58"
      stroke="#0f172a" stroke-width="4"
      stroke-linecap="round"/>

    <!-- Text lines inside lens -->
    <line x1="36" y1="38" x2="48" y2="38"
      stroke="#64748b" stroke-width="1.5"/>
    <line x1="36" y1="42" x2="48" y2="42"
      stroke="#64748b" stroke-width="1.5"/>
    <line x1="36" y1="46" x2="45" y2="46"
      stroke="#64748b" stroke-width="1.5"/>
  </svg>
  `;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
