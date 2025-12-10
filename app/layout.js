import './globals.css';

export default function RootLayout({ children }) {
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
        {children}
        <footer style={footerStyle}>
          <a href="/privacy" style={linkStyle}>Privacy Policy</a>
        </footer>
      </body>
    </html>
  );
}
