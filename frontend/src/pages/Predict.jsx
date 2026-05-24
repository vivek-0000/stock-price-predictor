// src/pages/Predict.jsx
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { stockAPI } from '../services/api';
import { Card, SectionTitle, MetricBox, Loader, ErrorBox } from '../components/ui';

const MODELS = ['tensorflow', 'pytorch'];
const MODEL_COLORS = { tensorflow: '#58a6ff', pytorch: '#bc8cff' };

export default function Predict({ ticker }) {
  const [model,   setModel]   = useState('tensorflow');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    stockAPI.predict(ticker, model)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [ticker, model]);

  // Build chart data
  const chartData = data
    ? data.dates.map((d, i) => ({
        date:      d,
        actual:    +data.actual[i].toFixed(2),
        predicted: +data.predicted[i].toFixed(2),
      }))
    : [];

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 6, padding: '10px 14px',
        fontFamily: 'var(--font-mono)', fontSize: 11,
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: ${p.value.toFixed(2)}
          </div>
        ))}
        {payload.length === 2 && (
          <div style={{ color: 'var(--text2)', marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            Δ error: ${Math.abs(payload[0].value - payload[1].value).toFixed(2)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.page} className="fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600 }}>${ticker}</div>
          <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
            Historical test-set prediction · 2012–2024 · 80/20 split
          </div>
        </div>
        <div style={styles.modelTabs}>
          {MODELS.map(m => (
            <button key={m} onClick={() => setModel(m)} style={{
              ...styles.tab,
              ...(model === m ? { ...styles.tabActive, color: MODEL_COLORS[m], borderColor: MODEL_COLORS[m] } : {})
            }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      {data && (
        <div style={styles.metrics}>
          {[
            ['MAE',  `$${data.metrics.mae}`,  'Mean Absolute Error'],
            ['RMSE', `$${data.metrics.rmse}`, 'Root Mean Square Error'],
            ['MAPE', `${data.metrics.mape}%`, 'Mean Absolute % Error'],
            ['R²',   `${data.metrics.r2}`,    'Coefficient of Determination'],
          ].map(([l, v, s]) => (
            <MetricBox key={l} label={l} value={v} sub={s}
              color={l === 'R²' ? 'var(--green)' : l === 'MAPE' ? 'var(--yellow)' : 'var(--accent)'} />
          ))}
        </div>
      )}

      {/* Chart */}
      <Card style={{ padding: '20px 8px 8px 8px' }}>
        <div style={{ padding: '0 12px 12px' }}>
          <SectionTitle
            label={`${model.toUpperCase()} LSTM — Actual vs Predicted`}
            sub={`${chartData.length} test-set trading days`}
          />
        </div>

        {loading && <Loader text="RUNNING INFERENCE..." />}
        {error   && <div style={{ padding: 16 }}><ErrorBox message={error} /></div>}

        {!loading && !error && (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                tickInterval={tickInterval}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                tickFormatter={v => `$${v}`}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 11, paddingTop: 8 }}
              />
              <Line
                type="monotone" dataKey="actual" name="Actual"
                stroke="var(--green)" strokeWidth={1.5}
                dot={false} activeDot={{ r: 4 }}
              />
              <Line
                type="monotone" dataKey="predicted" name="Predicted"
                stroke={MODEL_COLORS[model]} strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false} activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={styles.disclaimer}>
        ⚠ Predictions shown are on the held-out test set (20% of 2012–2024 data). Not real-time.
      </div>
    </div>
  );
}

const styles = {
  page:      { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  metrics:   { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },
  modelTabs: { display: 'flex', gap: 6 },
  tab: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    color: 'var(--text2)', background: 'var(--bg2)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '6px 14px', cursor: 'pointer', letterSpacing: 1,
    transition: 'all 0.15s',
  },
  tabActive: { background: 'rgba(88,166,255,0.08)' },
  disclaimer:{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', padding: '4px 0' },
};
