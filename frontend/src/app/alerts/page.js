'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const SEV = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.3)',  label: 'CRITICAL' },
  high:     { color: '#F59E0B', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', label: 'HIGH' },
  medium:   { color: '#2196F3', bg: 'rgba(33,150,243,.1)', border: 'rgba(33,150,243,.3)', label: 'MEDIUM' },
  low:      { color: '#10B981', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.3)', label: 'LOW' },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState('all');
  const [showAcked, setShowAcked] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getAlerts()
      .then(data => { if (mounted) setAlerts(data); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const ack = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a));

  const visible = alerts.filter(a =>
    (filter === 'all' || a.sev === filter) &&
    (showAcked || !a.ack)
  );

  const unacked = alerts.filter(a => !a.ack).length;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Alerts &amp; Notifications
            {unacked > 0 && (
              <span style={{
                background: '#EF4444', color: '#fff',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px', fontWeight: 700,
                padding: '1px 7px', borderRadius: '99px',
                boxShadow: '0 0 8px rgba(239,68,68,0.5)',
              }}>{unacked}</span>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E' }}>Real-time seismic events and system health alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={() => setAlerts(a => a.map(x => ({ ...x, ack: true })))}>
            Acknowledge All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {['all', 'critical', 'high', 'medium', 'low'].map(f => {
          const s = SEV[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px', borderRadius: '4px', border: `1px solid ${filter === f && f !== 'all' ? s?.border : '#21262D'}`,
              background: filter === f ? (f === 'all' ? '#2196F3' : s?.bg) : 'transparent',
              color: filter === f ? (f === 'all' ? '#fff' : s?.color) : '#8B949E',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
              fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}>{f}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#8B949E' }}>
          <input type="checkbox" checked={showAcked} onChange={e => setShowAcked(e.target.checked)}
            style={{ accentColor: '#2196F3' }} />
          Show acknowledged
        </label>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', gap: '14px' }}>
              <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '120px', height: '10px', marginBottom: '8px' }} />
                <div className="skeleton" style={{ width: '200px', height: '10px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '80px', height: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '32px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#EF4444' }}>{error}</span>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ fontSize: '11px' }}>Retry</button>
        </div>
      )}

      {!loading && !error && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map(a => {
          const s = SEV[a.sev];
          return (
            <div key={a.id} className="card" style={{
              padding: '14px 16px',
              borderLeft: `4px solid ${s.color}`,
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              opacity: a.ack ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Severity icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: s.bg, border: `1px solid ${s.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round">
                  {a.sev === 'critical' || a.sev === 'high'
                    ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                  }
                </svg>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px', fontWeight: 700,
                    color: s.color, letterSpacing: '0.08em',
                    background: s.bg, border: `1px solid ${s.border}`,
                    padding: '1px 6px', borderRadius: '3px',
                  }}>{s.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#8B949E' }}>{a.type}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#2196F3' }}>{a.station}</span>
                  {a.ack && <span className="badge badge-green" style={{ fontSize: '9px' }}>ACK</span>}
                </div>
                <p style={{ fontSize: '13px', color: '#C9D1D9', lineHeight: '1.5' }}>{a.msg}</p>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58', marginTop: '4px' }}>
                  {a.id} · {a.ts} UTC
                </div>
              </div>

              {/* Actions */}
              {!a.ack && (
                <button
                  onClick={() => ack(a.id)}
                  className="btn btn-ghost"
                  style={{ fontSize: '10px', flexShrink: 0 }}
                >Acknowledge</button>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
