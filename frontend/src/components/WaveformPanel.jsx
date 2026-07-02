'use client';
import { useEffect, useRef } from 'react';

const AXIS_CONFIG = {
  Z: { color: '#00FF00', label: 'Z (Vertical)',  glowColor: 'rgba(0,255,0,0.5)' },
  N: { color: '#00FFFF', label: 'N (North)',     glowColor: 'rgba(0,255,255,0.5)' },
  E: { color: '#FFBF00', label: 'E (East)',      glowColor: 'rgba(255,191,0,0.5)' },
  P: { color: '#EF4444', label: 'P-Wave Prob',    glowColor: 'rgba(239,68,68,0.5)' },
};

function WaveformTrack({ axisKey, data }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pendingQueueRef = useRef([]);
  const displayBufferRef = useRef(new Array(5000).fill(0));
  const hasReceivedDataRef = useRef(false);
  const lastTimeRef = useRef(performance.now());
  const samplesToConsumeRef = useRef(0);
  const animRef = useRef(null);
  const cfg = AXIS_CONFIG[axisKey];

  const BUFFER_SIZE = 5000; // 10 seconds at 500Hz

  // Sync data updates to pending queue
  useEffect(() => {
    if (data && data.length > 0) {
      pendingQueueRef.current.push(...data);
      hasReceivedDataRef.current = true;

      // Prevent the queue from growing too large (e.g. if tab is inactive)
      if (pendingQueueRef.current.length > 1500) {
        pendingQueueRef.current = pendingQueueRef.current.slice(-500);
      }
    }
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        canvas.width = r.width;
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

      // Calculate elapsed time to consume samples
      const now = performance.now();
      let elapsed = now - lastTimeRef.current;
      if (elapsed > 1000) {
        elapsed = 16.67; // Default to ~1 frame (60fps) if tab was inactive
      }
      lastTimeRef.current = now;

      // Consume samples from pending queue at a rate of 500 samples/sec
      if (hasReceivedDataRef.current) {
        const rate = 500 / 1000; // 0.5 samples per ms
        samplesToConsumeRef.current += elapsed * rate;
        const toConsume = Math.floor(samplesToConsumeRef.current);
        if (toConsume > 0) {
          samplesToConsumeRef.current -= toConsume;
          const consumed = pendingQueueRef.current.splice(0, toConsume);
          if (consumed.length > 0) {
            displayBufferRef.current.push(...consumed);
            if (displayBufferRef.current.length > BUFFER_SIZE) {
              displayBufferRef.current = displayBufferRef.current.slice(-BUFFER_SIZE);
            }
          }
        }
      }

      ctx.fillStyle = '#0A0D13';
      ctx.fillRect(0, 0, w, h);

      // Draw grid lines
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

      if (axisKey !== 'P') {
        ctx.strokeStyle = '#252D3A';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw warning threshold lines (at 25% and 75% height)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h / 4);
        ctx.lineTo(w, h / 4);
        ctx.moveTo(0, (3 * h) / 4);
        ctx.lineTo(w, (3 * h) / 4);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (!hasReceivedDataRef.current) {
        ctx.fillStyle = '#484F58';
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for stream data...', w / 2, h / 2);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const sliced = displayBufferRef.current;
      const step = w / sliced.length;

      if (axisKey === 'P') {
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#EF444440');
        gradient.addColorStop(1, '#EF444410');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < sliced.length; i++) {
          const x = i * step;
          const y = h - sliced[i] * h;
          i === 0 ? ctx.moveTo(x, h) : ctx.lineTo(x, y);
          ctx.lineTo(x, y);
        }
        ctx.lineTo((sliced.length - 1) * step, h);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < sliced.length; i++) {
          const x = i * step;
          const y = h - sliced[i] * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        const thresholdY = h - 0.5 * h;
        ctx.strokeStyle = '#EF444440';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(w, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < sliced.length; i++) {
          if (sliced[i] < min) min = sliced[i];
          if (sliced[i] > max) max = sliced[i];
        }
        const range = max - min || 1;

        const buildPath = () => {
          ctx.beginPath();
          for (let i = 0; i < sliced.length; i++) {
            const x = i * step;
            const y = (max === min) ? h / 2 : (1 - (sliced[i] - min) / range) * h;
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
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cfg.color, axisKey]);

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', height: axisKey === 'P' ? '50px' : '80px', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
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

      {axisKey !== 'P' && (
        <div style={{
          width: '36px', minWidth: '36px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '6px 4px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          {['Max', ' 0', 'Min'].map(l => (
            <span key={l} style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '8px', color: '#484F58',
              textAlign: 'right', display: 'block',
            }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WaveformPanel({ waveformData, predictions = [], stationCode }) {
  const zSamples = waveformData?.z_samples || [];
  const nSamples = waveformData?.n_samples || [];
  const eSamples = waveformData?.e_samples || [];
  
  // Interpolate P-wave probability to match seismic waveform sample sizes (500 samples/sec)
  const currentP = waveformData?.p_wave ?? predictions[0]?.p_wave ?? 0;
  const prevPWaveRef = useRef(currentP);
  const prevP = prevPWaveRef.current;
  
  const pSamples = Array.from({ length: 500 }, (_, i) => prevP + (currentP - prevP) * (i / 499));
  
  useEffect(() => {
    prevPWaveRef.current = currentP;
  }, [currentP]);

  const latestPWave = predictions[0]?.p_wave ?? waveformData?.p_wave ?? null;
  const pct = latestPWave != null ? Math.round(latestPWave * 100) : 0;
  const pWaveColor = pct >= 80 ? '#EF4444' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#2196F3' : '#10B981';

  const hasData = zSamples.length > 0 || nSamples.length > 0 || eSamples.length > 0;

  return (
    <div className="card" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hasData ? '#10B981' : '#F59E0B', boxShadow: hasData ? '0 0 8px #10B981' : 'none', animation: hasData ? 'livePulse 1.6s infinite' : 'none' }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#8B949E',
          }}>{hasData ? `Channels + P-Wave — ${stationCode || ''}` : 'No Stream Data'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {latestPWave != null && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: pWaveColor }}>
              P-Wave: {pct}%
            </span>
          )}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58' }}>WINDOW: 10s</span>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: '74px', paddingRight: '36px',
        marginBottom: '6px',
      }}>
        {['-10s', '-8s', '-6s', '-4s', '-2s', 'NOW'].map(t => (
          <span key={t} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', color: '#484F58',
          }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <WaveformTrack key={`Z-${stationCode}`} axisKey="Z" data={zSamples} />
        <WaveformTrack key={`N-${stationCode}`} axisKey="N" data={nSamples} />
        <WaveformTrack key={`E-${stationCode}`} axisKey="E" data={eSamples} />
        <WaveformTrack key={`P-${stationCode}`} axisKey="P" data={pSamples} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: '74px', paddingRight: '36px',
        marginTop: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {[
            { color: '#00FF00', label: 'Z (Vertical)' },
            { color: '#00FFFF', label: 'N (North)' },
            { color: '#FFBF00', label: 'E (East)' },
            { color: '#EF4444', label: 'P-Wave' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '14px', height: '2px', background: color, borderRadius: '1px', boxShadow: `0 0 4px ${color}` }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#8B949E' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
