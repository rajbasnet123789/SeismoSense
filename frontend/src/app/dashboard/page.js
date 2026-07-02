'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveData } from '@/context/LiveDataContext';
import WaveformPanel from '@/components/WaveformPanel';

function WaveformCanvas({ station, channel, color }) {
  const ref = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const samplesRef = useRef([]);
  const [hasData, setHasData] = useState(false);
  const { getWaveform } = useLiveData();

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const samples = samplesRef.current;
    if (!samples || samples.length === 0) return;
    const { width: w, height: h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0A0D13';
    ctx.fillRect(0, 0, w, h);

    // Draw horizontal grid lines
    ctx.strokeStyle = '#21262D';
    ctx.lineWidth = 0.5;
    for (let yVal = 0.2; yVal < 1.0; yVal += 0.2) {
      ctx.beginPath();
      ctx.moveTo(0, yVal * h);
      ctx.lineTo(w, yVal * h);
      ctx.stroke();
    }

    // Draw dashed warning threshold lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0.25 * h);
    ctx.lineTo(w, 0.25 * h);
    ctx.moveTo(0, 0.75 * h);
    ctx.lineTo(w, 0.75 * h);
    ctx.stroke();
    ctx.setLineDash([]);

    const data = samples.slice(0, 500);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;
    const step = w / data.length;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = (1 - (data[i] - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [color]);

  // Set up ResizeObserver to track container dimension changes
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        sizeRef.current = { width, height };
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    // 1. Initial preload from cache
    const initial = getWaveform(station);
    if (initial) {
      const key = `${channel.toLowerCase()}_samples`;
      const samples = initial[key] || [];
      if (samples.length > 0) {
        samplesRef.current = samples;
        setHasData(true);
        requestAnimationFrame(draw);
      }
    }

    // 2. Subscribe to event-driven updates
    const handleUpdate = (e) => {
      const data = e.detail;
      const key = `${channel.toLowerCase()}_samples`;
      const samples = data[key] || [];
      if (samples.length > 0) {
        samplesRef.current = samples;
        setHasData(true);
        requestAnimationFrame(draw);
      }
    };

    window.addEventListener(`seismo:waveform:${station}`, handleUpdate);
    return () => {
      window.removeEventListener(`seismo:waveform:${station}`, handleUpdate);
    };
  }, [station, channel, draw, getWaveform]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!hasData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484F58', fontSize: 11, background: '#0D1117' }}>
          Waiting for {station} data…
        </div>
      )}
    </div>
  );
}

function PWaveGauge({ pWave }) {
  const ref = useRef(null);
  const pct = pWave != null ? Math.round(pWave * 100) : 0;
  const color = pct >= 80 ? '#EF4444' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#2196F3' : '#10B981';

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    const cx = 80;
    const cy = 80;
    const r = 60;
    ctx.clearRect(0, 0, 160, 160);
    ctx.beginPath();
    ctx.arc(cx, cy, r, -0.75 * Math.PI, 0.75 * Math.PI);
    ctx.strokeStyle = '#21262D';
    ctx.lineWidth = 12;
    ctx.stroke();
    const angle = -0.75 * Math.PI + (pct / 100) * 1.5 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -0.75 * Math.PI, angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pct}%`, cx, cy - 8);
    ctx.fillStyle = '#8B949E';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('P-Wave', cx, cy + 18);
  }, [pct, color]);

  return <canvas ref={ref} style={{ width: 160, height: 160, display: 'block', margin: '0 auto' }} />;
}

function ChannelLabel({ axis, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ width: 20, height: 20, borderRadius: 4, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color }}>{axis}</div>
      <span style={{ fontSize: 11, color: '#8B949E' }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const {
    stations,
    selectedStation,
    selectStation,
    loading,
    wsConnected,
    getWaveform,
    getPredictions,
  } = useLiveData();

  const [selectedStationData, setSelectedStationData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const stationCode = selectedStation || 'SHL';

  useEffect(() => {
    setSelectedStationData(getWaveform(stationCode));

    const handleUpdate = (e) => {
      setSelectedStationData(e.detail);
    };

    window.addEventListener(`seismo:waveform:${stationCode}`, handleUpdate);
    return () => {
      window.removeEventListener(`seismo:waveform:${stationCode}`, handleUpdate);
    };
  }, [stationCode, getWaveform]);

  useEffect(() => {
    setPredictions(getPredictions(stationCode));

    const handleUpdate = (e) => {
      setPredictions(e.detail);
    };

    window.addEventListener(`seismo:predictions:${stationCode}`, handleUpdate);
    return () => {
      window.removeEventListener(`seismo:predictions:${stationCode}`, handleUpdate);
    };
  }, [stationCode, getPredictions]);

  const latestPWave = selectedStationData?.p_wave ?? predictions[0]?.p_wave ?? null;

  const COLORS = { Z: '#00FF00', N: '#00FFFF', E: '#FFBF00' };
  const CHANNELS = [
    { axis: 'Z', label: 'Vertical', color: COLORS.Z },
    { axis: 'N', label: 'North', color: COLORS.N },
    { axis: 'E', label: 'East', color: COLORS.E },
  ];

  const selMeta = stations.find(s => s.code === stationCode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>
            {stationCode} — {selMeta?.location?.split(',')[0] || 'India'} Seismic Monitor
          </h1>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            {wsConnected ? 'Real-time stream active' : 'Connecting to live stream…'}
          </p>
        </div>
        <select
          value={stationCode}
          onChange={e => selectStation(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #30363D', background: '#0D1117', color: '#E6EDF3', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
        >
          {stations.map(s => (
            <option key={s.code} value={s.code}>{s.code}.{s.network || 'IN'} — {s.status}</option>
          ))}
        </select>
      </div>

      {loading && stations.length === 0 ? (
        <div style={{ color: '#484F58', textAlign: 'center', padding: 40 }}>Loading stations…</div>
      ) : !stationCode ? (
        <div style={{ color: '#484F58', textAlign: 'center', padding: 40 }}>No stations available</div>
      ) : (
        <>
          <WaveformPanel
            waveformData={selectedStationData}
            predictions={predictions}
            stationCode={stationCode}
          />

          <div style={{ background: '#0D1117', border: '1px solid #21262D', borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#484F58', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 14px', borderBottom: '1px solid #21262D', flexShrink: 0 }}>
              Recent Predictions — {stationCode}
            </div>
            {predictions.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#484F58', fontSize: 12, flex: 1 }}>
                {wsConnected ? 'Waiting for first prediction…' : 'No predictions yet'}
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #21262D' }}>
                      {['#', 'Station', 'P-Wave', 'Confidence', 'Time'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: '#484F58', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p, i) => {
                      const pct = Math.round(p.p_wave * 100);
                      const barColor = pct >= 80 ? '#EF4444' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#2196F3' : '#10B981';
                      return (
                        <tr key={p.id || i} style={{ borderBottom: '1px solid #161B22' }}>
                          <td style={{ padding: '8px 14px', color: '#484F58', fontFamily: 'JetBrains Mono, monospace' }}>{p.id || i + 1}</td>
                          <td style={{ padding: '8px 14px', color: '#E6EDF3', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{p.station}</td>
                          <td style={{ padding: '8px 14px' }}><div style={{ height: 6, width: `${pct}%`, maxWidth: 80, background: barColor, borderRadius: 3 }} /></td>
                          <td style={{ padding: '8px 14px', color: barColor, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{pct}%</td>
                          <td style={{ padding: '8px 14px', color: '#8B949E', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.created_at ? new Date(p.created_at).toLocaleTimeString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
