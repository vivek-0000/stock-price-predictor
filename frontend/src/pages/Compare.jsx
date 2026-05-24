// src/pages/Compare.jsx
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { stockAPI } from '../services/api';
import { Card, SectionTitle, Loader, ErrorBox, Badge } from '../components/ui';

export default function Compare({ ticker }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    stockAPI.compare(ticker)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  const tf = data?.models?.tensorflow;
  const pt = data?.models?.pytorch;

  // Overlay chart — both predictions + actual
  const chartData = tf && pt
    ? tf.dates.map((d, i) => ({
        date:       d,
        actual:     +tf.actual[i].toFixed(2),
        tensorflow: +tf.predicted[i].toFixed(2),
        pytorch:    +pt.predicted[i].toFixed(2),
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
            {p.name}: ${p.value?.toFixed(2)}
          </div>
        ))}
      </div>
    );
  };

  const METRICS = ['mae','rmse','mape','r2'];
  const METRIC_LABELS = { mae:'MAE', rmse:'RMSE', mape:'MAPE', r2:'R²' };
  const METRIC_FMT = { mae: v=>`$${v}`, rmse: v=>`$${v}`, mape: v=>`${v}%`, r2: v=>`${v}` };

  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.header}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600 }}>${ticker}</div>
          <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
            TensorFlow vs PyTorch — same architecture, same data
          </div>
        </div>
        {data?.overall_winner && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text2)', marginBottom: 6 }}>
              OVERALL WINNER
            </div>
            <Badge
              label={data.overall_winner.toUpperCase()}
              color={data.overall_winner === 'tensorflow' ? 'var(--accent)' : 'var(--purple)'}
            />
          </div>
        )}
      </div>

      {loading && <Loader text="COMPARING MODELS..." />}
      {error   && <ErrorBox message={error} />}

      {!loading && !error && data && (
        <>
          {/* Metrics comparison table */}
          <Card>
            <SectionTitle label="Metrics Comparison" sub="Lower is better for MAE / RMSE / MAPE · Higher is better for R²" />
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Metric</th>
                  <th style={{ ...styles.th, color: 'var(--accent)' }}>TensorFlow</th>
                  <th style={{ ...styles.th, color: 'var(--purple)' }}>PyTorch</th>
                  <th style={styles.th}>Winner</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => {
                  const tfVal = tf?.metrics?.[m];
                  const ptVal = pt?.metrics?.[m];
                  const winner = data?.winners?.[m];
                  const tfBetter = winner === 'tensorflow';
                  return (
                    <tr key={m} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {METRIC_LABELS[m]}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: tfBetter ? 'var(--accent)' : 'var(--text2)' }}>
                        {tfVal != null ? METRIC_FMT[m](tfVal) : '—'}
                        {tfBetter && <span style={{ marginLeft: 6, fontSize: 10 }}>✓</span>}
                      </td>
                      <td style={{ ...styles.td, color: !tfBetter ? 'var(--purple)' : 'var(--text2)' }}>
                        {ptVal != null ? METRIC_FMT[m](ptVal) : '—'}
                        {!tfBetter && <span style={{ marginLeft: 6, fontSize: 10 }}>✓</span>}
                      </td>
                      <td style={styles.td}>
                        <Badge
                          label={winner?.toUpperCase() || '—'}
                          color={winner === 'tensorflow' ? 'var(--accent)' : 'var(--purple)'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Overlay chart */}
          <Card style={{ padding: '20px 8px 8px 8px' }}>
            <div style={{ padding: '0 12px 12px' }}>
              <SectionTitle label="Prediction Overlay" sub="Both models vs actual price" />
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                  tickInterval={tickInterval} tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text2)' }}
                  tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="actual"     name="Actual"
                  stroke="var(--green)"  strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="tensorflow" name="TensorFlow"
                  stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                <Line type="monotone" dataKey="pytorch"    name="PyTorch"
                  stroke="var(--purple)" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

const styles = {
  page:   { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  table:  { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 13 },
  th:     { padding: '10px 16px', textAlign: 'left', color: 'var(--text2)', fontSize: 11,
            letterSpacing: 1, borderBottom: '1px solid var(--border)', fontWeight: 500 },
  tr:     { borderBottom: '1px solid var(--border)' },
  td:     { padding: '12px 16px', color: 'var(--text)' },
};
