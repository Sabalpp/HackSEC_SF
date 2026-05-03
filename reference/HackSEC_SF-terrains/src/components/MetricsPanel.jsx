export function MetricsPanel({ metrics }) {
  return (
    <div className="section">
      <div className="section__title">Live readiness</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {metrics.map((m) => (
          <div className="metric" key={m.id} data-tone={m.tone}>
            <div className="metric__label">{m.label}</div>
            <div className="metric__value">
              {Math.round(m.value)}
              {m.unit ? <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>{m.unit}</span> : null}
            </div>
            <div className="metric__bar">
              <div style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
