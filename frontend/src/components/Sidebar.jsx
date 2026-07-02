'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ActivityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const NAV = [
  { href: '/dashboard',      label: 'Live Monitor',      Icon: ActivityIcon },
  { href: '/history',        label: 'History & Logs',    Icon: ClockIcon },
  { href: '/india-map',      label: 'India Map',         Icon: MapIcon },
  { href: '/stations',       label: 'Station Mgmt',      Icon: GlobeIcon },
  { href: '/alerts',         label: 'Alerts',            Icon: BellIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0,
      width: '64px', height: '100vh',
      background: '#0D1117',
      borderRight: '1px solid #21262D',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '14px 0',
      zIndex: 200,
    }}>
      {/* Logo mark */}
      <Link href="/dashboard" style={{ marginBottom: '6px' }}>
        <div style={{
          width: '38px', height: '38px',
          background: 'linear-gradient(135deg, #1565C0 0%, #2196F3 100%)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(33,150,243,0.35)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
      </Link>

      <div style={{ width: '32px', height: '1px', background: '#21262D', margin: '10px 0' }} />

      {/* Main nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', width: '100%', padding: '0 8px' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                width: '48px', height: '48px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                color: active ? '#2196F3' : '#8B949E',
                background: active ? 'rgba(33,150,243,0.12)' : 'transparent',
                border: active ? '1px solid rgba(33,150,243,0.3)' : '1px solid transparent',
                transition: 'all 0.18s ease',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1C2128'; e.currentTarget.style.color = '#C9D1D9'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B949E'; }}}
            >
              <Icon />
              {/* Active indicator bar */}
              {active && (
                <div style={{
                  position: 'absolute', left: '-8px',
                  width: '3px', height: '24px',
                  background: '#2196F3',
                  borderRadius: '0 3px 3px 0',
                  boxShadow: '0 0 8px rgba(33,150,243,0.6)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', padding: '0 8px' }}>
        <div style={{
          width: '48px', height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8B949E',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #1976D2, #00B4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: '#fff',
          cursor: 'pointer',
        }}>
          GS
        </div>
      </div>
    </aside>
  );
}
