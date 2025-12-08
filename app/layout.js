export const metadata = {
  title: "Funbot 3000",
  description: "Tell Funbot a little (or nothing) and get a fun activity."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, Arial, sans-serif", background: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
