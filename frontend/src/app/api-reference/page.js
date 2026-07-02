'use client';
import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ENDPOINTS = [
  {
    method: 'GET', path: '/health',
    tag: 'System',
    desc: 'API health check with database connectivity test.',
    params: [],
    response: `{
  "status": "healthy",
  "database": "connected"
}`,
    color: '#10B981',
  },
  {
    method: 'POST', path: '/signup',
    tag: 'Auth',
    desc: 'Register a new user with Argon2-hashed password.',
    params: [
      { name: 'name',         type: 'string',  req: true,  desc: 'Full name (1-100 chars)' },
      { name: 'email',        type: 'email',   req: true,  desc: 'Valid email address' },
      { name: 'password',     type: 'string',  req: true,  desc: 'Password (6-100 chars)' },
      { name: 'phone_number', type: 'string',  req: false, desc: 'Optional phone number (max 20 chars)' },
    ],
    response: `{
  "id": 1,
  "name": "Analyst",
  "email": "user@example.com",
  "phone_number": null,
  "created_at": "2024-01-15T09:42:31"
}`,
    color: '#2196F3',
  },
  {
    method: 'POST', path: '/login',
    tag: 'Auth',
    desc: 'Authenticate user credentials and return a JWT access token.',
    params: [
      { name: 'username', type: 'string', req: true, desc: 'Registered email address' },
      { name: 'password', type: 'string', req: true, desc: 'Account password' },
    ],
    response: `{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}`,
    color: '#9C27B0',
  },
  {
    method: 'GET', path: '/users/me',
    tag: 'Auth',
    desc: 'Get the authenticated user profile. Requires Bearer token.',
    params: [],
    response: `{
  "id": 1,
  "name": "Analyst",
  "email": "user@example.com",
  "phone_number": null,
  "created_at": "2024-01-15T09:42:31"
}`,
    color: '#2196F3',
  },
  {
    method: 'GET', path: '/predictions',
    tag: 'Data',
    desc: 'Retrieve stream predictions from seismic sensor Kafka consumers.',
    params: [
      { name: 'limit',  type: 'integer', req: false, desc: 'Max records (default: 100)' },
      { name: 'offset', type: 'integer', req: false, desc: 'Pagination offset (default: 0)' },
    ],
    response: `[
  {
    "id": 1,
    "station": "SHL.IU",
    "p_wave": 0.874,
    "created_at": "2024-01-15T09:42:31"
  }
]`,
    color: '#F59E0B',
  },
  {
    method: 'GET', path: '/predictions/station/{station}',
    tag: 'Data',
    desc: 'Filter predictions by a specific seismic station code.',
    params: [
      { name: 'station', type: 'string',  req: true,  desc: 'FDSN station code (e.g. SHL.IU)' },
      { name: 'limit',   type: 'integer', req: false, desc: 'Max records (default: 100)' },
      { name: 'offset',  type: 'integer', req: false, desc: 'Pagination offset (default: 0)' },
    ],
    response: `[
  {
    "id": 42,
    "station": "SHL.IU",
    "p_wave": 0.912,
    "created_at": "2024-01-15T09:42:31"
  }
]`,
    color: '#F59E0B',
  },
  {
    method: 'GET', path: '/stations',
    tag: 'Data',
    desc: 'List all seismic stations with aggregated metrics from stream data.',
    params: [],
    response: `[
  {
    "code": "SHL",
    "network": "IU",
    "status": "online",
    "rate": 100,
    "events": 14,
    "last_seen": "09:42:31"
  }
]`,
    color: '#10B981',
  },
  {
    method: 'GET', path: '/alerts',
    tag: 'Data',
    desc: 'Recent high-probability seismic events formatted as alerts.',
    params: [
      { name: 'limit', type: 'integer', req: false, desc: 'Max alerts (default: 20)' },
    ],
    response: `[
  {
    "id": "ALT-0042",
    "sev": "critical",
    "type": "Seismic Event",
    "station": "SHL.IU",
    "msg": "M3.6 detected — confidence 91.2% — station SHL.IU",
    "ts": "09:42:31",
    "ack": false
  }
]`,
    color: '#EF4444',
  },
];

const METHOD_COLORS = {
  GET:    { bg: 'rgba(16,185,129,.12)',   color: '#10B981',  border: 'rgba(16,185,129,.3)'   },
  POST:   { bg: 'rgba(33,150,243,.12)',   color: '#2196F3',  border: 'rgba(33,150,243,.3)'   },
  PUT:    { bg: 'rgba(245,158,11,.12)',   color: '#F59E0B',  border: 'rgba(245,158,11,.3)'   },
  DELETE: { bg: 'rgba(239,68,68,.12)',    color: '#EF4444',  border: 'rgba(239,68,68,.3)'    },
};

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLORS[ep.method];

  return (
    <div className="card" style={{
      borderLeft: `3px solid ${ep.color}`,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: '12px', padding: '14px 16px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Method badge */}
        <div style={{
          padding: '3px 9px', borderRadius: '3px',
          background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
          flexShrink: 0, minWidth: '48px', textAlign: 'center',
        }}>{ep.method}</div>

        {/* Path */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '13px', fontWeight: 600, color: '#E6EDF3',
          flex: 1,
        }}>{ep.path}</span>

        {/* Tag */}
        <span className="badge badge-blue">{ep.tag}</span>

        {/* Toggle icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #21262D' }}>
          <p style={{ fontSize: '13px', color: '#8B949E', marginTop: '12px', lineHeight: '1.6' }}>{ep.desc}</p>

          {/* Parameters */}
          {ep.params.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: '8px' }}>Parameters</div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Type</th><th>Required</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map(p => (
                    <tr key={p.name}>
                      <td><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#2196F3' }}>{p.name}</code></td>
                      <td><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C27B0' }}>{p.type}</code></td>
                      <td>
                        {p.req
                          ? <span className="badge badge-red" style={{ fontSize: '9px' }}>required</span>
                          : <span className="badge badge-green" style={{ fontSize: '9px' }}>optional</span>
                        }
                      </td>
                      <td style={{ color: '#8B949E', fontSize: '12px' }}>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Response */}
          <div>
            <div className="section-title" style={{ marginBottom: '8px' }}>Example Response · 200 OK</div>
            <pre>{ep.response}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiReferencePage() {
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '900px' }}>
      <div>
        <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px' }}>
          Developer API Reference
        </h1>
        <p style={{ fontSize: '13px', color: '#8B949E' }}>FastAPI · REST + SSE · Base URL: <code style={{ color: '#2196F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{API_BASE_URL}</code></p>
      </div>

      {/* Auth note */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(33,150,243,0.06)',
        border: '1px solid rgba(33,150,243,0.2)',
        borderRadius: '6px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ fontSize: '12px', color: '#8B949E' }}>
          Authentication via <code style={{ fontFamily: 'JetBrains Mono, monospace', color: '#2196F3', fontSize: '11px' }}>Authorization: Bearer &lt;token&gt;</code> header on all endpoints.
        </span>
      </div>

      {ENDPOINTS.map(ep => (
        <EndpointCard key={ep.path} ep={ep} />
      ))}
    </div>
  );
}
