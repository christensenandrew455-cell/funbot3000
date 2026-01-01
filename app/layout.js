import './globals.css';

export default function RootLayout({ children }) {
  const headerStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    fontFamily: "'Inter', sans-serif",
  };

  const brandStyle = {
    fontSize: 18,
    fontWeight: 700,
    textDecoration: 'none',
  };

  const footerStyle = {
    marginTop: 40,
    padding: '20px 10px',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: '#555',
    borderTop: '1px solid #ddd',
    background: '#f9f9f9',
  };

  const linkStyle = {
    color: '#4A6CF7',
    textDecoration: 'none',
    fontWeight: 500,
  };

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {/* HEADER */}
        <header style={headerStyle}>
          <a href="/" style={brandStyle}>
            <span style={{ color: '#000' }}>Drop</span>
            <span style={{ color: '#4A6CF7', textDecoration: 'underline' }}>
              Link
            </span>
          </a>
        </header>

        {/* PAGE CONTENT */}
        {children}

        {/* FOOTER */}
        <footer style={footerStyle}>
          <a href="/privacy" style={linkStyle}>Privacy Policy</a>
        </footer>
      </body>
    </html>
  );
}
