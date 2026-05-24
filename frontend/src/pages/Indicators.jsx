// src/pages/Indicators.jsx
import { useEffect, useState } from 'react';
import {
  ComposedChart, LineChart, BarChart, Bar,
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { stockAPI } from '../services/api';
import { Card, SectionTitle, MetricBox, Loader, ErrorBox } from '../components/ui';

const START_OPTIONS = [
  { label: '1Y', value: new Date(Date.now()-365*86400000).toISOString().slice(0,10) },
  { label: '2Y', value: new Date(Date.now()-2*365*86400000).toISOString().slice(0,10) },
  { label: '3Y', value: new Date(Date.now()-3*365*86400000).toISOString().slice(0,10) },
  { label: 'MAX',value: '2012-01-01' },
];

export default function Indicators({ ticker }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [range,   setRange]   = useState(START_OPTIONS[0].value);

  useEffect(() => {
    setLoading(true); setError(null);
    stockAPI.indicators(ticker, range)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [ticker, range]);

  // Build chart datasets
  const priceData = data?.candlestick?.map((c, i) => ({
    date:    c.date,
    close:   c.close,
    volume:  c.volume,
    ma20:    data.ma.ma20[i],
    ma50:    data.ma.ma50[i],
    ma200:   data.ma.ma200[i],
    bb_upper:data.bollinger.upper[i],
    bb_lower:data.bollinger.lower[i],
  })) || [];

  const rsiData  = data?.rsi?.dates?.map((d,i) => ({ date:d, rsi:data.rsi.values[i]  })) || [];
  const macdData = data?.macd?.dates?.map((d,i) => ({ date:d, macd:data.macd.histogram[i] })) || [];

  const tickInterval = Math.max(1, Math.floor(priceData.length / 8));
  const s = data?.summary;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 6, padding: '10px 14px',
        fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 140,
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
        {payload.map(p => p.value != null && (
          <div key={p.name} style={{ color: p.color || 'var(--text)', marginBottom: 2 }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600 }}>${ticker}</div>
          <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>Technical Indicators</div>
        </div>
        <div style={styles.rangeTabs}>
          {START_OPTIONS.map(o => (
            <button key={o.label} onClick={() => setRange(o.value)} style={{
              ...styles.tab,
              ...(range === o.value ? styles.tabActive : {})
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loader text="FETCHING INDICATORS..." />}
      {error   && <ErrorBox message={error} />}

      {!loading && !error && data && (
        <>
          {/* Summary metrics */}
          <div style={styles.metrics}>
            <MetricBox label="Last Close"  value={`$${s?.last_close?.toFixed(2)}`} />
            <MetricBox label="Change"
              value={`${s?.change >= 0 ? '+' : ''}$${s?.change?.toFixed(2)}`}
              color={s?.change >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricBox label="RSI (14)"    value={s?.rsi_last?.toFixed(1)}
              color={s?.rsi_last > 70 ? 'var(--red)' : s?.rsi_last < 30 ? 'var(--green)' : 'var(--yellow)'}
              sub={s?.rsi_last > 70 ? 'Overbought' : s?.rsi_last < 30 ? 'Oversold' : 'Neutral'} />
            <MetricBox label="ATR (14)"    value={`$${s?.atr_last?.toFixed(2)}`}  sub="Avg True Range" />
            <MetricBox label="52W High"    value={`$${s?.['52w_high']?.toFixed(2)}`} color="var(--green)" />
            <MetricBox label="52W Low"     value={`$${s?.['52w_low']?.toFixed(2)}`}  color="var(--red)"   />
          </div>

          {/* Price + MA Chart */}
          <Card style={{ padding: '20px 8px 8px 8px' }}>
            <div style={{ padding: '0 12px 12px' }}>
              <SectionTitle label="Price & Moving Averages" sub="Close + MA20, MA50, MA200 + Bollinger Bands" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={priceData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--text2)' }}
                  tickInterval={tickInterval} tickLine={false} axisLine={{ stroke:'var(--border)' }} />
                <YAxis tick={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--text2)' }}
                  tickFormatter={v=>`$${v}`} tickLine={false} axisLine={false} width={65} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily:'var(--font-mono)', fontSize:10, paddingTop:8 }} />
                <Line type="monotone" dataKey="bb_upper" name="BB Upper" stroke="rgba(88,166,255,0.25)" strokeWidth={1} dot={false} strokeDasharray="2 2" />
                <Line type="monotone" dataKey="bb_lower" name="BB Lower" stroke="rgba(88,166,255,0.25)" strokeWidth={1} dot={false} strokeDasharray="2 2" />
                <Line type="monotone" dataKey="close"  name="Close"  stroke="var(--text)"   strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="ma20"   name="MA20"   stroke="var(--yellow)" strokeWidth={1}   dot={false} />
                <Line type="monotone" dataKey="ma50"   name="MA50"   stroke="var(--orange)" strokeWidth={1}   dot={false} />
                <Line type="monotone" dataKey="ma200"  name="MA200"  stroke="var(--red)"    strokeWidth={1}   dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div style={styles.grid2}>
            {/* RSI */}
            <Card style={{ padding: '20px 8px 8px 8px' }}>
              <div style={{ padding: '0 12px 12px' }}>
                <SectionTitle label="RSI (14)" sub="Overbought >70 · Oversold <30" />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rsiData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--text2)' }}
                    tickInterval={tickInterval} tickLine={false} axisLine={{ stroke:'var(--border)' }} />
                  <YAxis domain={[0,100]} tick={{ fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--text2)' }}
                    tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={70} stroke="var(--red)"   strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={30} stroke="var(--green)" strokeDasharray="3 3" strokeWidth={1} />
                  <Line type="monotone" dataKey="rsi" name="RSI"
                    stroke="var(--purple)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* MACD */}
            <Card style={{ padding: '20px 8px 8px 8px' }}>
              <div style={{ padding: '0 12px 12px' }}>
                <SectionTitle label="MACD Histogram" sub="Momentum indicator" />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={macdData} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--text2)' }}
                    tickInterval={tickInterval} tickLine={false} axisLine={{ stroke:'var(--border)' }} />
                  <YAxis tick={{ fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--text2)' }}
                    tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--border2)" />
                  <Bar dataKey="macd" name="MACD"
                    fill="var(--accent)" opacity={0.7}
                    // Color bars green/red based on value
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page:      { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  metrics:   { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 },
  grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  rangeTabs: { display: 'flex', gap: 4 },
  tab: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    color: 'var(--text2)', background: 'var(--bg2)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '5px 12px', cursor: 'pointer', letterSpacing: 1,
    transition: 'all 0.15s',
  },
  tabActive: { color: 'var(--accent)', background: 'rgba(88,166,255,0.08)', borderColor: 'var(--accent)' },
};
