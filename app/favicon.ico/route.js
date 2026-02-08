export const runtime = "nodejs";

const FAVICON_BASE64 =
  "AAABAAEAAQEAAAEAIAAwAAAAFgAAACgAAAABAAAAAgAAAAEAIAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const FAVICON_BYTES = Buffer.from(FAVICON_BASE64, "base64");

export function GET() {
  return new Response(FAVICON_BYTES, {
    status: 200,
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
