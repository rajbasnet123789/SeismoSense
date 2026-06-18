import React from 'react';

function CircularGauge({ value, size = 140 }) {
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;
  const color = value >= 80 ? '#EF4444' : value >= 60 ? '#F59E0B' : '#10B981';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262D" strokeWidth="9" />
      {/* Tick marks */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const inner = r - 4, outer = r + 1;
        return (
          <line
            key={i}
            x1={cx + inner * Math.cos(rad)} y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)} y2={cy + outer * Math.sin(rad)}
            stroke="#30363D" strokeWidth="1"
          />
        );
      })}
      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {/* Center value */}
      <text x={cx} y={cy - 8} textAnchor="middle"
        fill={color} fontSize="20" fontFamily="JetBrains Mono, monospace" fontWeight="700">
        {value.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        fill="#8B949E" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="2">
        PROBABILITY
      </text>
    </svg>
  );
}

function ProbBar({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: '#8B949E',
        width: '68px', flexShrink: 0,
      }}>{label}</div>
      <div style={{ flex: 1, height: '5px', background: '#21262D', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: color,
          borderRadius: '99px',
          boxShadow: `0 0 6px ${color}80`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color,
        width: '36px', textAlign: 'right', flexShrink: 0,
      }}>{value.toFixed(1)}%</div>
    </div>
  );
}

function riskBadge(eqProb) {
  if (eqProb >= 80) return { label: 'HIGH RISK', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
  if (eqProb >= 60) return { label: 'ELEVATED', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  if (eqProb >= 30) return { label: 'MONITOR',  color: '#2196F3', bg: 'rgba(33,150,243,0.12)', border: 'rgba(33,150,243,0.3)' };
  return { label: 'NOMINAL',  color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
}

export default function AIInferencePanel({ eqProb = 0, noiseProb = 0, explProb = 0 }) {
  const risk = riskBadge(eqProb);
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: '#8B949E',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        AI Inference
        <div style={{
          fontSize: '8px', padding: '2px 6px',
          background: risk.bg,
          border: `1px solid ${risk.border}`,
          borderRadius: '3px', color: risk.color,
        }}>{risk.label}</div>
      </div>

      {/* Gauge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CircularGauge value={eqProb} size={148} />
      </div>

      {/* Probability bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ProbBar label="Earthquake" value={eqProb}   color="#EF4444" />
        <ProbBar label="Noise"      value={noiseProb} color="#8B949E" />
        <ProbBar label="Explosion"  value={explProb}  color="#F59E0B" />
      </div>
    </div>
  );
}
