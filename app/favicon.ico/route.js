// app/favicon.ico/route.js
export const runtime = "nodejs";

export function GET() {
  // Note: This route is named "favicon.ico" but returns SVG for crisp scaling.
  // Most modern browsers accept this; if you see any browser not loading it,
  // we can also add app/icon.svg (recommended long-term).
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#ffffff"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-size="42" font-weight="900" fill="#2563eb"
      font-family="Arial, Helvetica, sans-serif">A</text>
    <circle cx="42" cy="42" r="12"
      stroke="#0f172a" stroke-width="3"
      fill="rgba(255,255,255,0.85)"/>
    <line x1="50" y1="50" x2="58" y2="58"
      stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
    <line x1="36" y1="38" x2="48" y2="38"
      stroke="#64748b" stroke-width="1.5"/>
    <line x1="36" y1="42" x2="48" y2="42"
      stroke="#64748b" stroke-width="1.5"/>
    <line x1="36" y1="46" x2="45" y2="46"
      stroke="#64748b" stroke-width="1.5"/>
  </svg>
  `.trim();

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
