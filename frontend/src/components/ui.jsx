// src/components/ui.jsx

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 8, padding: 20,
      ...style
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({ label, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--accent)', letterSpacing: 2,
        textTransform: 'uppercase', marginBottom: 2,
      }}>
        {label}
      </div>
      {sub && <div style={{ color: 'var(--text2)', fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export function MetricBox({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 6, padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text2)', letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 20,
        fontWeight: 600, color: color || 'var(--text)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Badge({ label, color = 'var(--accent)' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10,
      color, border: `1px solid ${color}`,
      padding: '2px 6px', borderRadius: 3,
      letterSpacing: 1,
    }}>
      {label}
    </span>
  );
}

export function Loader({ text = 'LOADING...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 60,
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text2)', letterSpacing: 2,
      }}>
        {text}
      </div>
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div style={{
      background: 'rgba(248,81,73,0.08)',
      border: '1px solid var(--red2)',
      borderRadius: 6, padding: '12px 16px',
      fontFamily: 'var(--font-mono)', fontSize: 12,
      color: 'var(--red)',
    }}>
      ✗ {message}
    </div>
  );
}

export function Tag({ up }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
      color: up ? 'var(--green)' : 'var(--red)',
    }}>
      {up ? '▲' : '▼'}
    </span>
  );
}
