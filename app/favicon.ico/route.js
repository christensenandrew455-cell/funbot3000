const EMPTY_ICON = new Uint8Array();

export function GET() {
  return new Response(EMPTY_ICON, {
    status: 200,
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
