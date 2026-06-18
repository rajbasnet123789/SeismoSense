'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const STATUS_COLORS = {
  online:   { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)' },
  degraded: { color: '#F59E0B', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)' },
  offline:  { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'  },
};

function StatusDot({ status }) {
  const s = STATUS_COLORS[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: s.color,
        boxShadow: status === 'online' ? `0 0 6px ${s.color}` : 'none',
        animation: status === 'online' ? 'livePulse 2s infinite' : 'none',
      }} />
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: s.color,
        fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{status}</span>
    </div>
  );
}

function PktBar({ value }) {
  const color = value >= 95 ? '#10B981' : value >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <div>
      <div style={{ width: '60px', height: '4px', background: '#21262D', borderRadius: '99px', overflow: 'hidden', marginBottom: '2px' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '99px' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

export default function StationsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getStations()
      .then(data => { if (mounted) setStations(data); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const counts = {
    all:      stations.length,
    online:   stations.filter(s => s.status === 'online').length,
    degraded: stations.filter(s => s.status === 'degraded').length,
    offline:  stations.filter(s => s.status === 'offline').length,
  };

  const visible = stations.filter(s =>
    (filter === 'all' || s.status === filter) &&
    ((s.code || '').toLowerCase().includes(search.toLowerCase()) ||
     (s.location || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px' }}>
            Station Management
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E' }}>FDSN global network · {stations.length} station{stations.length !== 1 ? 's' : ''} configured</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { label: 'Online',   count: counts.online,   color: '#10B981' },
          { label: 'Degraded', count: counts.degraded, color: '#F59E0B' },
          { label: 'Offline',  count: counts.offline,  color: '#EF4444' },
          { label: 'Total Hz', count: stations.reduce((a, s) => a + (s.rate || 0), 0), color: '#2196F3' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card" style={{ flex: 1, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#8B949E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '24px', fontWeight: 700, color, textShadow: `0 0 16px ${color}40` }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {!loading && !error && (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input placeholder="Search station…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '200px' }} />
        {['all', 'online', 'degraded', 'offline'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: '4px', border: 'none',
            background: filter === f ? (f === 'online' ? '#10B981' : f === 'degraded' ? '#F59E0B' : f === 'offline' ? '#EF4444' : '#2196F3') : '#1E2430',
            color: filter === f ? '#fff' : '#8B949E',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', cursor: 'pointer',
            textTransform: 'capitalize',
          }}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card" style={{ padding: '16px' }}>
              <div className="skeleton" style={{ width: '120px', height: '16px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ width: '80px', height: '10px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ width: '100%', height: '24px', marginBottom: '12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[1, 2, 3, 4].map(j => (
                  <div key={j}>
                    <div className="skeleton" style={{ width: '60%', height: '8px', marginBottom: '4px' }} />
                    <div className="skeleton" style={{ width: '40%', height: '12px' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '32px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#EF4444' }}>{error}</span>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ fontSize: '11px' }}>Retry</button>
        </div>
      )}

      {/* Station grid */}
      {!loading && !error && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {visible.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#484F58', fontSize: '13px' }}>
            No stations match the current filter.
          </div>
        )}
        {visible.map(s => {
          const sc = STATUS_COLORS[s.status] || STATUS_COLORS.offline;
          const hasCoords = s.lat && s.lon && (s.lat !== 0 || s.lon !== 0);
          return (
            <div key={s.code} className="card" style={{
              padding: '16px',
              borderTop: `2px solid ${sc.color}`,
              display: 'flex', flexDirection: 'column', gap: '10px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '16px', fontWeight: 700, color: '#E6EDF3',
                    lineHeight: 1,
                  }}>{s.code}
                    {s.network && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#484F58', marginLeft: '6px' }}>.{s.network}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '3px' }}>{s.location || (hasCoords ? `${s.lat.toFixed(2)}°, ${s.lon.toFixed(2)}°` : '—')}</div>
                </div>
                <StatusDot status={s.status} />
              </div>

              {/* Coords */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#484F58',
                background: '#0D1117', padding: '5px 8px', borderRadius: '3px',
              }}>
                {hasCoords ? `${s.lat.toFixed(4)}°, ${s.lon.toFixed(4)}°` : '—'}
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { k: 'Sample Rate', v: s.rate ? `${s.rate} Hz` : '—',  c: s.rate === 100 ? '#10B981' : s.rate > 0 ? '#F59E0B' : '#EF4444' },
                  { k: 'Kafka Lag',   v: s.lag != null ? String(s.lag) : '—', c: '#8B949E' },
                  { k: 'Last Seen',   v: s.last_seen || '—',             c: '#8B949E' },
                  { k: 'Events/day',  v: String(s.events ?? 0),           c: (s.events ?? 0) > 5 ? '#F59E0B' : '#8B949E' },
                ].map(({ k, v, c }) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Packet delivery */}
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Packet Delivery</div>
                <PktBar value={s.pkts ?? 0} />
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
