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

  const footerLinks = {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
    marginTop: 8,
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
          <div>
            <strong>Fun Bot 3000</strong> helps you discover fun, personalized activities quickly and easily—whether you want something random or tailored to your preferences.
          </div>
          <div style={footerLinks}>
            <a href="/faq" style={linkStyle}>FAQ</a>
            <a href="/privacy" style={linkStyle}>Privacy Policy</a>
            <a href="/learn-more" style={linkStyle}>Learn More</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
