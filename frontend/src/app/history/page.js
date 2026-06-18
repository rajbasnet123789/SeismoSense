'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const confColor = (c) => c >= 80 ? '#10B981' : c >= 60 ? '#F59E0B' : '#EF4444';
const typeBadge = (t) => {
  if (t === 'Earthquake') return 'badge-red';
  if (t === 'Noise') return '';
  return 'badge-amber';
};

function MiniSparkline({ data }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 52, h = 20;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline points={points} fill="none" stroke="#2196F3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function classifyPWave(val) {
  if (val < 0.2) return 'Noise';
  if (val < 0.5) return 'Low';
  if (val > 0.75) return 'Earthquake';
  return 'Medium';
}

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getPredictions(200)
      .then(data => { if (mounted) setPredictions(data); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const historyRows = predictions.map(p => {
    const conf = +(p.p_wave * 100).toFixed(1);
    const type = classifyPWave(p.p_wave);
    const mag = p.p_wave > 0.5 ? +(p.p_wave * 4).toFixed(1) : null;
    const spark = [p.p_wave * 100 * 0.6, p.p_wave * 100 * 0.7, p.p_wave * 100 * 0.8, p.p_wave * 100 * 0.9, conf, conf, conf].map(v => +v.toFixed(0));
    return {
      id: p.id,
      ts: p.created_at ? p.created_at.replace('T', ' ').slice(0, 19) : '—',
      station: p.station,
      lat: null,
      lon: null,
      mag,
      conf,
      type,
      depth: '—',
      spark,
    };
  });

  const filtered = historyRows.filter(r => {
    const matchSearch = r.station.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || r.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px' }}>
            Prediction History &amp; Logs
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E' }}>
            ML inference outputs · confidence-scored · FDSN sourced
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-blue">{loading ? '…' : filtered.length + ' records'}</span>
          <button className="btn btn-ghost" style={{ fontSize: '11px' }}>Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          placeholder="Search station, type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '220px' }}
        />
        {['All', 'Earthquake', 'Medium', 'Low', 'Noise'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: '5px 12px', borderRadius: '4px', border: 'none',
              background: filterType === t ? '#2196F3' : '#1E2430',
              color: filterType === t ? '#fff' : '#8B949E',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <select style={{ fontSize: '12px' }}>
          <option>Last 24 hours</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
      </div>

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

      {/* Table */}
      {!error && <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp (UTC)</th>
              <th>Station</th>
              <th>Coordinates</th>
              <th>Type</th>
              <th>Magnitude</th>
              <th>Confidence</th>
              <th>Depth</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#8B949E', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                  Loading prediction data…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#484F58', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                  No records found
                </td>
              </tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td style={{ color: '#484F58', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>#{r.id}</td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#8B949E' }}>{r.ts}</td>
                <td>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px', fontWeight: 600, color: '#2196F3',
                  }}>{r.station}</span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#8B949E' }}>
                  {r.lat ? `${r.lat.toFixed(2)}°, ${r.lon?.toFixed(2)}°` : '—'}
                </td>
                <td>
                  <span className={`badge ${typeBadge(r.type)}`} style={{
                    background: r.type === 'Earthquake' ? 'rgba(239,68,68,.12)' : r.type === 'Noise' ? 'rgba(139,148,158,.1)' : 'rgba(245,158,11,.12)',
                    color: r.type === 'Earthquake' ? '#EF4444' : r.type === 'Noise' ? '#8B949E' : '#F59E0B',
                    border: `1px solid ${r.type === 'Earthquake' ? 'rgba(239,68,68,.3)' : r.type === 'Noise' ? 'rgba(139,148,158,.2)' : 'rgba(245,158,11,.3)'}`,
                  }}>{r.type}</span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: r.mag ? '#10B981' : '#484F58' }}>
                  {r.mag ? `${r.mag} Mw` : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '48px', height: '4px', background: '#21262D', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.conf}%`, background: confColor(r.conf), borderRadius: '99px' }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: confColor(r.conf) }}>
                      {r.conf.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#8B949E' }}>{r.depth}</td>
                <td><MiniSparkline data={r.spark} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {[1, 2, 3, '...', 12].map((p, i) => (
          <button key={i} style={{
            width: '32px', height: '32px', borderRadius: '4px', border: 'none',
            background: p === 1 ? '#2196F3' : '#1E2430',
            color: p === 1 ? '#fff' : '#8B949E',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '12px',
            cursor: 'pointer',
          }}>{p}</button>
        ))}
      </div>
    </div>
  );
}
