// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Alitrite",
  description:
    "AI-assisted Amazon product checker. Paste a product link and get a simple trust & value rating.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Light-touch typography. If Inter isn't loaded elsewhere, it safely falls back. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#f6f8fc",
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
