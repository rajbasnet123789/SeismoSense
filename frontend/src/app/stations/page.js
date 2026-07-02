'use client';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useLiveData } from '@/context/LiveDataContext';
import Link from 'next/link';

const STATUS_COLORS = {
  online:   { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)' },
  degraded: { color: '#F59E0B', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)' },
  offline:  { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'  },
};

function StatusDot({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.offline;
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
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: '99px', transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const MiniWaveform = memo(function MiniWaveform({ stationCode, channel, color, height = 24 }) {
  const ref = useRef(null);
  const sizeRef = useRef({ width: 260, height });
  const samplesRef = useRef([]);
  const [isVisible, setIsVisible] = useState(false);
  const [hasData, setHasData] = useState(false);
  const { getWaveform } = useLiveData();

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const samples = samplesRef.current;
    if (!samples || samples.length === 0) return;
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const data = samples.slice(0, 200);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;
    const step = w / data.length;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = (1 - (data[i] - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [color]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
      if (entry.isIntersecting) {
        requestAnimationFrame(draw);
      }
    }, { threshold: 0.05 });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const initial = getWaveform(stationCode);
    if (initial) {
      const key = `${channel.toLowerCase()}_samples`;
      const samples = initial[key] || [];
      if (samples.length > 0) {
        samplesRef.current = samples;
        setHasData(true);
        if (isVisible) {
          requestAnimationFrame(draw);
        }
      }
    }

    const handleUpdate = (e) => {
      const data = e.detail;
      const key = `${channel.toLowerCase()}_samples`;
      const samples = data[key] || [];
      if (samples.length > 0) {
        samplesRef.current = samples;
        setHasData(true);
        if (isVisible) {
          requestAnimationFrame(draw);
        }
      }
    };

    window.addEventListener(`seismo:waveform:${stationCode}`, handleUpdate);
    return () => {
      window.removeEventListener(`seismo:waveform:${stationCode}`, handleUpdate);
    };
  }, [stationCode, channel, draw, getWaveform, isVisible]);

  return (
    <div style={{ position: 'relative', height, width: '100%', background: '#0A0D13', borderRadius: 4, overflow: 'hidden' }}>
      <canvas ref={ref} width={260} height={height} style={{ width: '100%', height, display: 'block' }} />
      {!hasData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#484F58', fontFamily: 'JetBrains Mono, monospace' }}>
          Awaiting signal…
        </div>
      )}
    </div>
  );
});

const StationCard = memo(function StationCard({ station, onSelect }) {
  const s = station;
  const { getWaveform } = useLiveData();
  const [pWave, setPWave] = useState(null);

  useEffect(() => {
    const initial = getWaveform(s.code);
    if (initial) {
      setPWave(initial.p_wave);
    }
    const handleUpdate = (e) => {
      setPWave(e.detail.p_wave);
    };
    window.addEventListener(`seismo:waveform:${s.code}`, handleUpdate);
    return () => {
      window.removeEventListener(`seismo:waveform:${s.code}`, handleUpdate);
    };
  }, [s.code, getWaveform]);

  const sc = STATUS_COLORS[s.status] || STATUS_COLORS.offline;
  const hasCoords = s.lat != null && s.lon != null && (s.lat !== 0 || s.lon !== 0);

  return (
    <div className="card" style={{
      padding: '16px',
      borderTop: `2px solid ${sc.color}`,
      display: 'flex', flexDirection: 'column', gap: '10px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: '4px' }}>
          <div style={{ position: 'relative', height: '24px' }}>
            <MiniWaveform stationCode={s.code} channel="Z" color="#00FF00" height={24} />
            <span style={{ position: 'absolute', left: '4px', top: '2px', fontSize: '8px', fontFamily: 'JetBrains Mono, monospace', color: '#00FF00', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 2px', borderRadius: '2px', zIndex: 5 }}>Z</span>
          </div>
          <div style={{ position: 'relative', height: '24px' }}>
            <MiniWaveform stationCode={s.code} channel="N" color="#00FFFF" height={24} />
            <span style={{ position: 'absolute', left: '4px', top: '2px', fontSize: '8px', fontFamily: 'JetBrains Mono, monospace', color: '#00FFFF', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 2px', borderRadius: '2px', zIndex: 5 }}>N</span>
          </div>
          <div style={{ position: 'relative', height: '24px' }}>
            <MiniWaveform stationCode={s.code} channel="E" color="#FFBF00" height={24} />
            <span style={{ position: 'absolute', left: '4px', top: '2px', fontSize: '8px', fontFamily: 'JetBrains Mono, monospace', color: '#FFBF00', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 2px', borderRadius: '2px', zIndex: 5 }}>E</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', marginTop: '2px' }}>
          <span style={{ fontSize: '9px', color: '#8B949E', fontFamily: 'JetBrains Mono, monospace' }}>P-WAVE PROB:</span>
          <span style={{ 
            fontSize: '11px', 
            fontFamily: 'JetBrains Mono, monospace', 
            fontWeight: 700, 
            color: pWave >= 0.8 ? '#EF4444' : pWave >= 0.5 ? '#F59E0B' : pWave != null ? '#10B981' : '#484F58'
          }}>{pWave != null ? `${(pWave * 100).toFixed(1)}%` : '—'}</span>
        </div>
      </div>

      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#484F58',
        background: '#0D1117', padding: '5px 8px', borderRadius: '3px',
      }}>
        {hasCoords ? `${s.lat.toFixed(4)}°, ${s.lon.toFixed(4)}°` : '—'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { k: 'Sample Rate', v: s.rate ? `${s.rate} Hz` : '—',  c: s.rate === 100 ? '#10B981' : s.rate > 0 ? '#F59E0B' : '#484F58' },
          { k: 'Kafka Lag',   v: s.lag != null ? String(s.lag) : '—', c: '#8B949E' },
          { k: 'Last Seen',   v: s.last_seen || '—',             c: s.status === 'online' ? '#10B981' : '#8B949E' },
          { k: 'Events/day',  v: String(s.events ?? 0),           c: (s.events ?? 0) > 5 ? '#F59E0B' : '#8B949E' },
        ].map(({ k, v, c }) => (
          <div key={k}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{k}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Packet Delivery</div>
          <PktBar value={s.pkts ?? 0} />
        </div>
        <Link
          href="/dashboard"
          onClick={() => onSelect(s.code)}
          style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
            color: '#2196F3', textDecoration: 'none', padding: '4px 8px',
            border: '1px solid rgba(33,150,243,0.3)', borderRadius: 4,
          }}
        >
          Monitor →
        </Link>
      </div>
    </div>
  );
});

export default function StationsPage() {
  const { stations, loading, wsConnected, apiConnected } = useLiveData();

  const shlStation = stations.find(s => s.code === 'SHL');

  const showSkeleton = loading && stations.length === 0;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px' }}>
            SHL Station — Shillong, India
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E' }}>
            FDSN single station · Shillong, Meghalaya
            {wsConnected && <span style={{ color: '#10B981', marginLeft: 8 }}>· streaming live</span>}
            {!wsConnected && apiConnected && <span style={{ color: '#F59E0B', marginLeft: 8 }}>· waiting for stream</span>}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { label: 'Status',      value: shlStation?.status || '—',       color: shlStation?.status === 'online' ? '#10B981' : shlStation?.status === 'degraded' ? '#F59E0B' : '#EF4444' },
          { label: 'Sample Rate', value: shlStation?.rate ? `${shlStation.rate} Hz` : '—', color: '#2196F3' },
          { label: 'Last Seen',   value: shlStation?.last_seen || '—',    color: '#8B949E' },
          { label: 'Events',      value: String(shlStation?.events ?? 0), color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ flex: 1, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#8B949E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color, textShadow: `0 0 16px ${color}40` }}>{value}</div>
          </div>
        ))}
      </div>

      {showSkeleton ? (
        <div className="card" style={{ padding: '16px' }}>
          <div className="skeleton" style={{ width: '120px', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '80px', height: '10px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '12px' }} />
        </div>
      ) : shlStation ? (
        <StationCard station={shlStation} onSelect={() => {}} />
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: '#484F58', fontSize: '13px' }}>
          No SHL station data available yet.
        </div>
      )}
    </div>
  );
}
