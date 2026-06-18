'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const [time, setTime]       = useState('');
  const [stations, setStations] = useState([]);
  const [station, setStation] = useState('');
  const [userName, setUserName] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const update = () => {
      setTime(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    };
    update();
    const id = setInterval(update, 1000);

    api.getStations()
      .then(data => {
        setStations(data);
        if (data.length > 0) setStation(`${data[0].code}.${data[0].network}`);
      })
      .catch(() => {});

    api.healthCheck()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    const healthInterval = setInterval(() => {
      api.healthCheck()
        .then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    }, 30000);

    try {
      const u = JSON.parse(localStorage.getItem('ss_user') || '{}');
      setUserName(u.name || u.email?.split('@')[0] || 'User');
    } catch {}

    return () => { clearInterval(id); clearInterval(healthInterval); };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ss_auth');
    localStorage.removeItem('ss_user');
    router.replace('/signin');
  };

  return (
    <header style={{
      height: '58px',
      background: '#161B22',
      borderBottom: '1px solid #21262D',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: '16px',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700, fontSize: '16px',
          color: '#E6EDF3', letterSpacing: '-0.02em',
        }}>
          Seismo<span style={{ color: '#2196F3' }}>Sense</span>
        </span>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#2196F3',
          boxShadow: '0 0 8px rgba(33,150,243,0.8)',
        }} />
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: '#21262D' }} />

      {/* Live badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="live-dot" />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px', fontWeight: 700,
          color: '#10B981', letterSpacing: '0.1em',
        }}>LIVE</span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Station selector — dynamic from /stations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#8B949E', fontFamily: 'JetBrains Mono, monospace' }}>STATION</span>
        <select
          value={station}
          onChange={e => setStation(e.target.value)}
          style={{
            background: '#1E2430',
            border: '1px solid #21262D',
            color: '#E6EDF3',
            borderRadius: '4px',
            padding: '4px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {stations.length === 0 && <option>Loading…</option>}
          {stations.map(s => (
            <option key={`${s.code}.${s.network}`} value={`${s.code}.${s.network}`}>
              {s.code}.{s.network}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: '#21262D' }} />

      {/* Timestamp */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px', color: '#8B949E',
        letterSpacing: '0.03em',
      }}>
        {time}
      </span>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: '#21262D' }} />

      {/* Connection status */}
      <div className={`badge ${isConnected ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isConnected ? '#10B981' : '#EF4444' }} />
        {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: '#21262D' }} />

      {/* User avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #1976D2, #00B4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {userName ? userName.slice(0, 2).toUpperCase() : 'SS'}
        </div>
        {userName && (
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: '#8B949E', maxWidth: '90px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{userName}</span>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Sign out"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 10px',
          background: 'transparent',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '5px',
          color: '#EF4444',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>
    </header>
  );
}
