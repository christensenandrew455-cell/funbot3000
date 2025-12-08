export const metadata = {
  title: "Funbot 3000",
  description: "Your personal activity finder!"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen p-6">{children}</body>
    </html>
  );
}
