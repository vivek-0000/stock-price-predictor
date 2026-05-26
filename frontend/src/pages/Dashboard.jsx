// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { stockAPI } from '../services/api';
import { Card, SectionTitle, MetricBox, Loader, ErrorBox, Tag, Badge } from '../components/ui';

export default function Dashboard({ ticker }) {
  const [forecast,  setForecast]  = useState(null);
  const [monthly,   setMonthly]   = useState(null);
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [mLoading,  setMLoading]  = useState(true);
  const [error,     setError]     = useState(null);
  const [days,      setDays]      = useState(30);
  const [mModel,    setMModel]    = useState('tensorflow');

  // Load next-day forecast + health
  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([stockAPI.forecast(ticker, 'both'), stockAPI.health()])
      .then(([fRes, hRes]) => { setForecast(fRes.data); setHealth(hRes.data); })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  // Load monthly forecast
  useEffect(() => {
    setMLoading(true);
    stockAPI.monthlyForecast(ticker, days, mModel)
      .then(r => setMonthly(r.data))
      .catch(() => setMonthly(null))
      .finally(() => setMLoading(false));
  }, [ticker, days, mModel]);

  if (loading) return <Loader text="FETCHING FORECAST..." />;
  if (error)   return <div style={{ padding: 24 }}><ErrorBox message={error} /></div>;

  const tf  = forecast?.tensorflow;
  const pt  = forecast?.pytorch;
  const up  = tf?.change >= 0;

  // Monthly chart data
  const mData = monthly?.[mModel]
    ? monthly[mModel].dates.map((d, i) => ({
        date:      d,
        predicted: monthly[mModel].predicted[i],
        conf_low:  monthly[mModel].conf_low[i],
        conf_high: monthly[mModel].conf_high[i],
      }))
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const pred = payload.find(p => p.dataKey === 'predicted');
    const low  = payload.find(p => p.dataKey === 'conf_low');
    const high = payload.find(p => p.dataKey === 'conf_high');
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 6, padding: '10px 14px',
        fontFamily: 'var(--font-mono)', fontSize: 11,
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
        {pred  && <div style={{ color: 'var(--accent)' }}>Forecast: ${pred.value?.toFixed(2)}</div>}
        {high  && <div style={{ color: 'var(--green)',  marginTop: 4 }}>High: ${high.value?.toFixed(2)}</div>}
        {low   && <div style={{ color: 'var(--red)' }}>Low:  ${low.value?.toFixed(2)}</div>}
      </div>
    );
  };

  const tickInterval = Math.max(1, Math.floor(mData.length / 6));

  return (
    <div style={styles.page} className="fade-in">

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.tickerLabel}>${ticker}</div>
          <div style={styles.subLabel}>
            Last close: <span style={{ color: 'var(--text)', fontWeight: 600 }}>${tf?.last_close?.toFixed(2)}</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <Badge label="TENSORFLOW" color="var(--accent)" />
          <Badge label="PYTORCH"    color="var(--purple)" />
          <Badge label={health?.models?.tensorflow === 'loaded' ? '● LIVE' : '○ OFFLINE'}
                 color={health?.models?.tensorflow === 'loaded' ? 'var(--green)' : 'var(--red)'} />
        </div>
      </div>

      {/* Next-Day Hero */}
      <Card style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.heroLabel}>TENSORFLOW FORECAST · {tf?.forecast_date}</div>
            <div style={styles.heroPrice}><Tag up={up} /> ${tf?.predicted_price?.toFixed(2)}</div>
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
        <div style={styles.priceBar}>
          <div style={{ ...styles.priceBarFill,
            width: up ? '60%' : '40%',
            background: up ? 'var(--green2)' : 'var(--red2)' }} />
        </div>
      </Card>

      {/* Both models */}
      <div style={styles.grid2}>
        <Card>
          <SectionTitle label="TensorFlow LSTM" sub="Primary model · lower MAPE" />
          <div style={styles.modelGrid}>
            <MetricBox label="Forecast"  value={`$${tf?.predicted_price?.toFixed(2)}`} color="var(--accent)" />
            <MetricBox label="Change"    value={`${tf?.change >= 0 ? '+' : ''}${tf?.change?.toFixed(2)}`}
              color={tf?.change >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Change %"  value={`${tf?.change_pct >= 0 ? '+' : ''}${tf?.change_pct?.toFixed(2)}%`}
              color={tf?.change_pct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Conf Low"  value={`$${tf?.conf_low?.toFixed(2)}`}  color="var(--red)"   />
            <MetricBox label="Conf High" value={`$${tf?.conf_high?.toFixed(2)}`} color="var(--green)" />
          </div>
        </Card>
        <Card>
          <SectionTitle label="PyTorch LSTM" sub="Secondary model · comparison" />
          <div style={styles.modelGrid}>
            <MetricBox label="Forecast"  value={`$${pt?.predicted_price?.toFixed(2)}`} color="var(--purple)" />
            <MetricBox label="Change"    value={`${pt?.change >= 0 ? '+' : ''}${pt?.change?.toFixed(2)}`}
              color={pt?.change >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Change %"  value={`${pt?.change_pct >= 0 ? '+' : ''}${pt?.change_pct?.toFixed(2)}%`}
              color={pt?.change_pct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="Agreement"
              value={tf?.change >= 0 === pt?.change >= 0 ? 'YES' : 'NO'}
              color={tf?.change >= 0 === pt?.change >= 0 ? 'var(--green)' : 'var(--yellow)'}
              sub="Both same direction?" />
          </div>
        </Card>
      </div>

      {/* ── Monthly Forecast Chart ── */}
      <Card style={{ padding: '20px 8px 8px 8px' }}>
        <div style={{ padding: '0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <SectionTitle
            label="Monthly Forecast"
            sub={`Next ${days} trading days · widening band = growing uncertainty`}
          />
          <div style={styles.controls}>
            {/* Days selector */}
            <div style={styles.controlGroup}>
              {[10, 20, 30, 45, 60].map(d => (
                <button key={d} onClick={() => setDays(d)} style={{
                  ...styles.ctrlBtn,
                  ...(days === d ? styles.ctrlBtnActive : {})
                }}>{d}D</button>
              ))}
            </div>
            {/* Model selector */}
            <div style={styles.controlGroup}>
              {['tensorflow', 'pytorch'].map(m => (
                <button key={m} onClick={() => setMModel(m)} style={{
                  ...styles.ctrlBtn,
                  ...(mModel === m ? {
                    ...styles.ctrlBtnActive,
                    color: m === 'tensorflow' ? 'var(--accent)' : 'var(--purple)',
                    borderColor: m === 'tensorflow' ? 'var(--accent)' : 'var(--purple)',
                  } : {})
                }}>{m === 'tensorflow' ? 'TF' : 'PT'}</button>
              ))}
            </div>
          </div>
        </div>

        {mLoading && <Loader text="COMPUTING FORECAST..." />}

        {!mLoading && mData.length > 0 && (
          <>
            {/* Summary row */}
            <div style={{ display: 'flex', gap: 12, padding: '0 12px 16px' }}>
              <MetricBox
                label="Day 1 Forecast"
                value={`$${mData[0]?.predicted?.toFixed(2)}`}
                color="var(--accent)"
              />
              <MetricBox
                label={`Day ${days} Forecast`}
                value={`$${mData[mData.length-1]?.predicted?.toFixed(2)}`}
                color="var(--purple)"
              />
              <MetricBox
                label="Total Change"
                value={`${((mData[mData.length-1]?.predicted - monthly?.[mModel]?.last_close) / monthly?.[mModel]?.last_close * 100).toFixed(2)}%`}
                color={mData[mData.length-1]?.predicted > monthly?.[mModel]?.last_close ? 'var(--green)' : 'var(--red)'}
                sub={`from $${monthly?.[mModel]?.last_close?.toFixed(2)}`}
              />
              <MetricBox
                label={`Day ${days} Band`}
                value={`$${mData[mData.length-1]?.conf_low?.toFixed(0)} – $${mData[mData.length-1]?.conf_high?.toFixed(0)}`}
                sub="Confidence range"
              />
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={mData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={mModel === 'tensorflow' ? '#58a6ff' : '#bc8cff'} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={mModel === 'tensorflow' ? '#58a6ff' : '#bc8cff'} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                  tickInterval={tickInterval} tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                  tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} width={65}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Confidence band */}
                <Area
                  type="monotone" dataKey="conf_high" stroke="none"
                  fill="url(#confGrad)" fillOpacity={1} name="Conf High"
                  legendType="none"
                />
                <Area
                  type="monotone" dataKey="conf_low" stroke="none"
                  fill="var(--bg)" fillOpacity={1} name="Conf Low"
                  legendType="none"
                />
                {/* Prediction line */}
                <Area
                  type="monotone" dataKey="predicted" name="Forecast"
                  stroke={mModel === 'tensorflow' ? 'var(--accent)' : 'var(--purple)'}
                  strokeWidth={2} fill="none"
                  dot={false} activeDot={{ r: 4 }}
                />
                {/* Last close reference */}
                <ReferenceLine
                  y={monthly?.[mModel]?.last_close}
                  stroke="var(--text3)" strokeDasharray="4 4" strokeWidth={1}
                  label={{ value: 'Last Close', fill: 'var(--text3)',
                           fontFamily: 'var(--font-mono)', fontSize: 9, position: 'insideTopRight' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ padding: '8px 12px 0', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>
              ⚠ Multi-step recursive forecast — each day feeds the next. Accuracy degrades beyond 7 days.
              Band width = ATR × (1 + 0.2 × day). Not financial advice.
            </div>
          </>
        )}
      </Card>

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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: v === 'loaded' ? 'var(--green)' : 'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={styles.disclaimer}>
        ⚠ Forecasts are generated by LSTM models trained on historical price data. For educational purposes only — not financial advice.
      </div>
    </div>
  );
}

const styles = {
  page:        { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  tickerLabel: { fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: 2 },
  subLabel:    { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)', marginTop: 4 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  hero:        { background: 'var(--bg3)' },
  heroTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLabel:   { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 8 },
  heroPrice:   { fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 600, color: 'var(--text)', lineHeight: 1 },
  heroChange:  { fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 8, fontWeight: 500 },
  heroBand:    { textAlign: 'right' },
  bandLabel:   { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 1, marginBottom: 8 },
  bandRange:   { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500 },
  priceBar:    { height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  priceBarFill:{ height: '100%', borderRadius: 2, transition: 'width 0.6s ease' },
  grid2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  modelGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  controls:    { display: 'flex', gap: 8, flexShrink: 0 },
  controlGroup:{ display: 'flex', gap: 4 },
  ctrlBtn: {
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
    color: 'var(--text2)', background: 'var(--bg2)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '4px 10px', cursor: 'pointer', letterSpacing: 1,
    transition: 'all 0.15s',
  },
  ctrlBtnActive: { color: 'var(--accent)', background: 'rgba(88,166,255,0.08)', borderColor: 'var(--accent)' },
  statusGrid:  { display: 'flex', flexDirection: 'column', gap: 8 },
  statusRow:   { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' },
  disclaimer:  { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', padding: '8px 0' },
};
