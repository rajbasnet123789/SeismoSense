'use client';
import { useEffect, useRef } from 'react';

const AXIS_CONFIG = {
  Z: { color: '#2196F3', label: 'Z (Vertical)',  glowColor: 'rgba(33,150,243,0.5)' },
  N: { color: '#00BCD4', label: 'N (North)',     glowColor: 'rgba(0,188,212,0.5)' },
  E: { color: '#9C27B0', label: 'E (East)',      glowColor: 'rgba(156,39,176,0.5)' },
};

const BUFFER_SIZE = 800;

function WaveformTrack({ axisKey, data }) {
  const canvasRef   = useRef(null);
  const containerRef = useRef(null);
  const dataRef     = useRef([]);
  const animRef     = useRef(null);
  const cfg = AXIS_CONFIG[axisKey];

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        canvas.width  = r.width;
        canvas.height = r.height;
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      if (w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = '#0A0D13';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#1A2030';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 10) * i, 0);
        ctx.lineTo((w / 10) * i, h);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 4) * i);
        ctx.lineTo(w, (h / 4) * i);
        ctx.stroke();
      }

      ctx.strokeStyle = '#252D3A';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const displayData = data && data.length > 0 ? data : dataRef.current;
      if (displayData.length < 2) {
        ctx.fillStyle = '#484F58';
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for stream data...', w / 2, h / 2);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const startIdx = Math.max(0, displayData.length - BUFFER_SIZE);
      const sliced = displayData.slice(startIdx);
      const step = w / sliced.length;

      const buildPath = () => {
        ctx.beginPath();
        for (let i = 0; i < sliced.length; i++) {
          const x = i * step;
          const y = h / 2 - sliced[i] * (h * 0.41);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
      };

      ctx.save();
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur  = 10;
      ctx.strokeStyle = cfg.color + '55';
      ctx.lineWidth   = 3.5;
      ctx.lineJoin    = 'round';
      buildPath();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur  = 4;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth   = 1.4;
      ctx.lineJoin    = 'round';
      buildPath();
      ctx.stroke();
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cfg.color, data]);

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', height: '90px', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{
        width: '74px', minWidth: '74px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'rgba(0,0,0,0.35)',
        borderRight: `2px solid ${cfg.color}`,
        gap: '3px',
        padding: '6px',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '15px', fontWeight: 700,
          color: cfg.color,
          textShadow: `0 0 10px ${cfg.color}`,
        }}>{axisKey}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '8px', color: '#8B949E',
          textAlign: 'center', lineHeight: 1.3,
        }}>
          {cfg.label.split(' ').slice(1).join(' ')}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      <div style={{
        width: '36px', minWidth: '36px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '6px 4px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {['+1.0', ' 0.0', '-1.0'].map(l => (
          <span key={l} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', color: '#484F58',
            textAlign: 'right', display: 'block',
          }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function WaveformPanel({ predictions = [] }) {
  const zData = predictions.slice(0, 100).map(p => p.p_wave);
  const nData = predictions.slice(0, 100).map(p => p.p_wave * 0.8 + (Math.random() * 0.1 - 0.05));
  const eData = predictions.slice(0, 100).map(p => p.p_wave * 0.6 + (Math.random() * 0.1 - 0.05));

  return (
    <div className="card" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: predictions.length > 0 ? '#10B981' : '#F59E0B', boxShadow: predictions.length > 0 ? '0 0 8px #10B981' : 'none', animation: predictions.length > 0 ? 'livePulse 1.6s infinite' : 'none' }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#8B949E',
          }}>{predictions.length > 0 ? 'Real-Time Seismic Waveforms' : 'No Stream Data'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58' }}>WINDOW: 60s</span>
          {predictions.length > 0 && <span className="badge badge-blue">100 Hz</span>}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: '74px', paddingRight: '36px',
        marginBottom: '6px',
      }}>
        {['-60s', '-50s', '-40s', '-30s', '-20s', '-10s', 'NOW'].map(t => (
          <span key={t} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', color: '#484F58',
          }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {['Z', 'N', 'E'].map((axis, i) => (
          <WaveformTrack key={axis} axisKey={axis} data={[zData, nData, eData][i]} />
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: '74px', paddingRight: '36px',
        marginTop: '6px',
      }}>
        {[
          { color: '#2196F3', label: 'Z-axis (Vertical)' },
          { color: '#00BCD4', label: 'N-axis (North)' },
          { color: '#9C27B0', label: 'E-axis (East)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '16px', height: '2px', background: color, borderRadius: '1px', boxShadow: `0 0 4px ${color}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#8B949E' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
