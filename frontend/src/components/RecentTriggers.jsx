

const LEVEL_COLORS = {
  critical: '#EF4444',
  high:     '#F59E0B',
  medium:   '#2196F3',
  low:      '#10B981',
};

const EMPTY = [];
export default function RecentTriggers({ triggers = EMPTY }) {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: '#8B949E',
      }}>
        Recent Triggers
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {triggers.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#484F58', fontSize: '11px' }}>
            No triggers yet
          </div>
        ) : triggers.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px',
            background: '#0D1117',
            border: `1px solid ${i === 0 ? LEVEL_COLORS[t.level] + '40' : '#21262D'}`,
            borderLeft: `3px solid ${LEVEL_COLORS[t.level]}`,
            borderRadius: '4px',
            transition: 'background 0.15s',
          }}>
            {/* Severity dot */}
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: LEVEL_COLORS[t.level],
              flexShrink: 0,
              boxShadow: i === 0 ? `0 0 6px ${LEVEL_COLORS[t.level]}` : 'none',
            }} />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px', fontWeight: 600,
                  color: '#E6EDF3',
                }}>{t.station}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px', color: '#484F58',
                }}>{t.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px', color: '#8B949E',
                }}>{t.type}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {t.mag !== '—' && (
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      color: LEVEL_COLORS[t.level],
                      fontWeight: 600,
                    }}>{t.mag}</span>
                  )}
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px', color: '#8B949E',
                  }}>{t.conf.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
