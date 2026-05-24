// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { stockAPI } from '../services/api';
import { Card, SectionTitle, MetricBox, Loader, ErrorBox, Tag, Badge } from '../components/ui';

export default function Dashboard({ ticker }) {
  const [forecast, setForecast] = useState(null);
  const [health,   setHealth]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([
      stockAPI.forecast(ticker, 'both'),
      stockAPI.health(),
    ])
      .then(([fRes, hRes]) => {
        setForecast(fRes.data);
        setHealth(hRes.data);
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return <Loader text="FETCHING FORECAST..." />;
  if (error)   return <div style={{ padding: 24 }}><ErrorBox message={error} /></div>;

  const tf = forecast?.tensorflow;
  const pt = forecast?.pytorch;
  const up = tf?.change >= 0;

  return (
    <div style={styles.page} className="fade-in">

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.tickerLabel}>${ticker}</div>
          <div style={styles.subLabel}>
            Last close: <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              ${tf?.last_close?.toFixed(2)}
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <Badge label="TENSORFLOW" color="var(--accent)" />
          <Badge label="PYTORCH"    color="var(--purple)" />
          <Badge label={health?.models?.tensorflow === 'loaded' ? '● LIVE' : '○ OFFLINE'}
                 color={health?.models?.tensorflow === 'loaded' ? 'var(--green)' : 'var(--red)'} />
        </div>
      </div>

      {/* Forecast Hero */}
      <Card style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.heroLabel}>TENSORFLOW FORECAST · {tf?.forecast_date}</div>
            <div style={styles.heroPrice}>
              <Tag up={up} />
              {' '}${tf?.predicted_price?.toFixed(2)}
            </div>
            <div style={{ ...styles.heroChange, color: up ? 'var(--green)' : 'var(--red)' }}>
              {up ? '+' : ''}{tf?.change?.toFixed(2)} ({up ? '+' : ''}{tf?.change_pct?.toFixed(2)}%)
            </div>
          </div>
          <div style={styles.heroBand}>
            <div style={styles.bandLabel}>ATR CONFIDENCE BAND</div>
            <div style={styles.bandRange}>
              <span style={{ color: 'var(--red)' }}>${tf?.conf_low?.toFixed(2)}</span>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}> ─── </span>
              <span style={{ color: 'var(--green)' }}>${tf?.conf_high?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Visual price bar */}
        <div style={styles.priceBar}>
          <div style={{ ...styles.priceBarFill, width: up ? '60%' : '40%',
            background: up ? 'var(--green2)' : 'var(--red2)' }} />
        </div>
      </Card>

      {/* Both models side by side */}
      <div style={styles.grid2}>
        <Card>
          <SectionTitle label="TensorFlow LSTM" sub="Primary model · lower MAPE" />
          <div style={styles.modelGrid}>
            <MetricBox label="Forecast"  value={`$${tf?.predicted_price?.toFixed(2)}`} color="var(--accent)" />
            <MetricBox label="Change"
              value={`${tf?.change >= 0 ? '+' : ''}${tf?.change?.toFixed(2)}`}
              color={tf?.change >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Change %"
              value={`${tf?.change_pct >= 0 ? '+' : ''}${tf?.change_pct?.toFixed(2)}%`}
              color={tf?.change_pct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Conf Low"  value={`$${tf?.conf_low?.toFixed(2)}`}  color="var(--red)"   />
            <MetricBox label="Conf High" value={`$${tf?.conf_high?.toFixed(2)}`} color="var(--green)" />
          </div>
        </Card>

        <Card>
          <SectionTitle label="PyTorch LSTM" sub="Secondary model · comparison" />
          <div style={styles.modelGrid}>
            <MetricBox label="Forecast"  value={`$${pt?.predicted_price?.toFixed(2)}`} color="var(--purple)" />
            <MetricBox label="Change"
              value={`${pt?.change >= 0 ? '+' : ''}${pt?.change?.toFixed(2)}`}
              color={pt?.change >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Change %"
              value={`${pt?.change_pct >= 0 ? '+' : ''}${pt?.change_pct?.toFixed(2)}%`}
              color={pt?.change_pct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Agreement"
              value={tf?.change >= 0 === pt?.change >= 0 ? 'YES' : 'NO'}
              color={tf?.change >= 0 === pt?.change >= 0 ? 'var(--green)' : 'var(--yellow)'}
              sub="Both models same direction?" />
          </div>
        </Card>
      </div>

      {/* System status */}
      <Card>
        <SectionTitle label="System Status" />
        <div style={styles.statusGrid}>
          {[
            ['TensorFlow', health?.models?.tensorflow],
            ['PyTorch',    health?.models?.pytorch],
            ['Device',     health?.device],
            ['Lookback',   `${health?.lookback} days`],
            ['Features',   health?.features?.join(', ')],
          ].map(([k, v]) => (
            <div key={k} style={styles.statusRow}>
              <span style={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{k}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: v === 'loaded' ? 'var(--green)' : 'var(--text)',
              }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={styles.disclaimer}>
        ⚠ This forecast is generated by LSTM models trained on historical price data.
        For educational purposes only — not financial advice.
      </div>
    </div>
  );
}

const styles = {
  page:       { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  tickerLabel:{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: 2 },
  subLabel:   { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)', marginTop: 4 },
  headerRight:{ display: 'flex', gap: 8, alignItems: 'center' },
  hero:       { background: 'var(--bg3)' },
  heroTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLabel:  { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 8 },
  heroPrice:  { fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 600, color: 'var(--text)', lineHeight: 1 },
  heroChange: { fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 8, fontWeight: 500 },
  heroBand:   { textAlign: 'right' },
  bandLabel:  { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 1, marginBottom: 8 },
  bandRange:  { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500 },
  priceBar:   { height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  priceBarFill:{ height: '100%', borderRadius: 2, transition: 'width 0.6s ease' },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  modelGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statusGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  statusRow:  { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' },
  disclaimer: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', padding: '8px 0', letterSpacing: 0.5 },
};
