// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const POPULAR_STOCKS = [
  // US Stocks
  { symbol: 'GOOG',  name: 'Alphabet (Google)',     flag: '🇺🇸' },
  { symbol: 'AAPL',  name: 'Apple',                 flag: '🇺🇸' },
  { symbol: 'MSFT',  name: 'Microsoft',             flag: '🇺🇸' },
  { symbol: 'AMZN',  name: 'Amazon',                flag: '🇺🇸' },
  { symbol: 'TSLA',  name: 'Tesla',                 flag: '🇺🇸' },
  { symbol: 'NVDA',  name: 'NVIDIA',                flag: '🇺🇸' },
  { symbol: 'META',  name: 'Meta',                  flag: '🇺🇸' },
  { symbol: 'NFLX',  name: 'Netflix',               flag: '🇺🇸' },
  // Indian NSE Stocks
  { symbol: 'RELIANCE.NS',  name: 'Reliance Industries', flag: '🇮🇳' },
  { symbol: 'TCS.NS',       name: 'Tata Consultancy',    flag: '🇮🇳' },
  { symbol: 'INFY.NS',      name: 'Infosys',             flag: '🇮🇳' },
  { symbol: 'HDFCBANK.NS',  name: 'HDFC Bank',           flag: '🇮🇳' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank',          flag: '🇮🇳' },
  { symbol: 'WIPRO.NS',     name: 'Wipro',               flag: '🇮🇳' },
  { symbol: 'SBIN.NS',      name: 'State Bank of India', flag: '🇮🇳' },
  { symbol: 'BAJFINANCE.NS',name: 'Bajaj Finance',       flag: '🇮🇳' },
  { symbol: 'HINDUNILVR.NS',name: 'Hindustan Unilever',  flag: '🇮🇳' },
  { symbol: 'ADANIENT.NS',  name: 'Adani Enterprises',   flag: '🇮🇳' },
  { symbol: 'TATAMOTORS.NS',name: 'Tata Motors',         flag: '🇮🇳' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma',          flag: '🇮🇳' },
  { symbol: 'ONGC.NS',      name: 'ONGC',                flag: '🇮🇳' },
  { symbol: 'AXISBANK.NS',  name: 'Axis Bank',           flag: '🇮🇳' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', flag: '🇮🇳' },
  { symbol: 'LT.NS',        name: 'Larsen & Toubro',     flag: '🇮🇳' },
  { symbol: 'MARUTI.NS',    name: 'Maruti Suzuki',       flag: '🇮🇳' },
  { symbol: 'BHARTIARTL.NS',name: 'Bharti Airtel',       flag: '🇮🇳' },
  { symbol: 'ITC.NS',       name: 'ITC',                 flag: '🇮🇳' },
  { symbol: 'ASIANPAINT.NS',name: 'Asian Paints',        flag: '🇮🇳' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid',          flag: '🇮🇳' },
];

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard'  },
  { to: '/predict',    label: 'Predict'    },
  { to: '/compare',    label: 'Compare'    },
  { to: '/indicators', label: 'Indicators' },
];

export default function Navbar({ ticker, onTickerChange }) {
  const { pathname }          = useLocation();
  const [input,  setInput]    = useState(ticker);
  const [open,   setOpen]     = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapRef               = useRef(null);

  // Filter suggestions as user types
  useEffect(() => {
    const q = input.trim().toUpperCase();
    if (!q) { setFiltered(POPULAR_STOCKS.slice(0, 8)); return; }
    const results = POPULAR_STOCKS.filter(s =>
      s.symbol.toUpperCase().includes(q) ||
      s.name.toUpperCase().includes(q)
    ).slice(0, 8);
    setFiltered(results);
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    const val = input.trim().toUpperCase();
    if (val) { onTickerChange(val); setOpen(false); }
  };

  const handleSelect = symbol => {
    setInput(symbol);
    onTickerChange(symbol);
    setOpen(false);
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
        {NAV_LINKS.map(l => (
          <Link key={l.to} to={l.to} style={{
            ...styles.link,
            ...(pathname === l.to ? styles.linkActive : {})
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Search with autocomplete */}
      <div ref={wrapRef} style={styles.searchWrap}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <span style={styles.formLabel}>$</span>
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={styles.input}
            placeholder="GOOG / TCS.NS"
            maxLength={20}
            autoComplete="off"
          />
          <button type="submit" style={styles.btn}>GO</button>
        </form>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div style={styles.dropdown}>
            {/* Market tabs hint */}
            <div style={styles.dropHeader}>
              <span style={{ color: 'var(--text3)' }}>🇺🇸 US</span>
              <span style={{ color: 'var(--text3)', margin: '0 6px' }}>·</span>
              <span style={{ color: 'var(--text3)' }}>🇮🇳 NSE (.NS suffix)</span>
            </div>

            {filtered.map(s => (
              <button
                key={s.symbol}
                onMouseDown={() => handleSelect(s.symbol)}
                style={styles.dropItem}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={styles.dropFlag}>{s.flag}</span>
                <div style={styles.dropInfo}>
                  <span style={styles.dropSymbol}>{s.symbol}</span>
                  <span style={styles.dropName}>{s.name}</span>
                </div>
                {s.symbol === ticker && (
                  <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 'auto' }}>✓</span>
                )}
              </button>
            ))}

            {/* Custom ticker hint */}
            {input.length > 0 && !POPULAR_STOCKS.find(s => s.symbol === input) && (
              <button
                onMouseDown={handleSubmit}
                style={{ ...styles.dropItem, borderTop: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={styles.dropFlag}>🔍</span>
                <div style={styles.dropInfo}>
                  <span style={styles.dropSymbol}>{input}</span>
                  <span style={styles.dropName}>Search for this ticker</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', gap: 32,
    padding: '0 24px', height: 52,
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 200,
  },
  logo:       { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon:   { color: 'var(--accent)', fontSize: 18, fontWeight: 700 },
  logoText:   { fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--text)', letterSpacing: 2 },
  logoBadge:  { fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--accent)',
                border: '1px solid var(--accent)', padding: '1px 4px', borderRadius: 2, letterSpacing: 1 },
  links:      { display: 'flex', gap: 4, flex: 1 },
  link: {
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
    color: 'var(--text2)', textDecoration: 'none',
    padding: '4px 12px', borderRadius: 4, transition: 'all 0.15s', letterSpacing: 0.5,
  },
  linkActive: { color: 'var(--accent)', background: 'rgba(88,166,255,0.08)' },
  searchWrap: { position: 'relative' },
  form:       { display: 'flex', alignItems: 'center' },
  formLabel: {
    fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 14,
    padding: '0 8px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRight: 'none', height: 32, lineHeight: '32px', borderRadius: '4px 0 0 4px',
  },
  input: {
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
    color: 'var(--text)', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRight: 'none',
    height: 32, padding: '0 8px', width: 130, outline: 'none', letterSpacing: 1,
  },
  btn: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    color: 'var(--bg)', background: 'var(--accent)',
    border: 'none', height: 32, padding: '0 12px',
    cursor: 'pointer', borderRadius: '0 4px 4px 0',
    letterSpacing: 1, transition: 'background 0.15s',
  },
  dropdown: {
    position: 'absolute', top: 36, right: 0,
    width: 300, background: 'var(--bg2)',
    border: '1px solid var(--border)', borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 300, overflow: 'hidden',
  },
  dropHeader: {
    padding: '8px 12px', fontSize: 10,
    fontFamily: 'var(--font-mono)', letterSpacing: 1,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg3)',
  },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '8px 12px',
    background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.1s',
  },
  dropFlag:   { fontSize: 16, flexShrink: 0 },
  dropInfo:   { display: 'flex', flexDirection: 'column', gap: 1 },
  dropSymbol: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' },
  dropName:   { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)' },
};
