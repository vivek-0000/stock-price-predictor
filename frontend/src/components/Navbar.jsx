// src/components/Navbar.jsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/',         label: 'Dashboard' },
  { to: '/predict',  label: 'Predict'   },
  { to: '/compare',  label: 'Compare'   },
  { to: '/indicators',label:'Indicators'},
];

export default function Navbar({ ticker, onTickerChange }) {
  const { pathname } = useLocation();
  const [input, setInput] = useState(ticker);

  const handleSubmit = e => {
    e.preventDefault();
    if (input.trim()) onTickerChange(input.trim().toUpperCase());
  };

  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>▲</span>
        <span style={styles.logoText}>STOCKML</span>
        <span style={styles.logoBadge}>BETA</span>
      </div>

      {/* Links */}
      <div style={styles.links}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            ...styles.link,
            ...(pathname === l.to ? styles.linkActive : {})
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Ticker input */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <span style={styles.formLabel}>$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          style={styles.input}
          placeholder="GOOG"
          maxLength={10}
        />
        <button type="submit" style={styles.btn}>GO</button>
      </form>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', gap: 32,
    padding: '0 24px', height: 52,
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { color: 'var(--accent)', fontSize: 18, fontWeight: 700 },
  logoText: {
    fontFamily: 'var(--font-mono)', fontWeight: 600,
    fontSize: 15, color: 'var(--text)', letterSpacing: 2,
  },
  logoBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
    color: 'var(--accent)', border: '1px solid var(--accent)',
    padding: '1px 4px', borderRadius: 2, letterSpacing: 1,
  },
  links: { display: 'flex', gap: 4, flex: 1 },
  link: {
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
    color: 'var(--text2)', textDecoration: 'none',
    padding: '4px 12px', borderRadius: 4,
    transition: 'all 0.15s',
    letterSpacing: 0.5,
  },
  linkActive: {
    color: 'var(--accent)',
    background: 'rgba(88,166,255,0.08)',
  },
  form: { display: 'flex', alignItems: 'center', gap: 0 },
  formLabel: {
    fontFamily: 'var(--font-mono)', color: 'var(--accent)',
    fontSize: 14, padding: '0 8px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRight: 'none', height: 32, lineHeight: '32px',
    borderRadius: '4px 0 0 4px',
  },
  input: {
    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
    color: 'var(--text)', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRight: 'none',
    height: 32, padding: '0 8px', width: 80, outline: 'none',
    letterSpacing: 1,
  },
  btn: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    color: 'var(--bg)', background: 'var(--accent)',
    border: 'none', height: 32, padding: '0 12px',
    cursor: 'pointer', borderRadius: '0 4px 4px 0',
    letterSpacing: 1, transition: 'background 0.15s',
  },
};
