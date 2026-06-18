import React from 'react';

// Simple SVG sparkline generator
function Sparkline({ data, color, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = height;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fill area */}
      <polygon
        points={`0,${h} ${points} ${(data.length - 1) * step},${h}`}
        fill={color}
        fillOpacity="0.08"
      />
    </svg>
  );
}

// Mini bar chart for Events card
function BarSparkline({ data, color }) {
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const barW = w / data.length - 2;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const barH = (v / max) * h;
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={h - barH}
            width={barW}
            height={barH}
            rx="1"
            fill={color}
            fillOpacity={i === data.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

// Confidence progress bar
function ConfBar({ value, color }) {
  return (
    <div style={{ width: '80px' }}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function StatCard({ title, value, unit, color, type, sparkData, delta }) {
  return (
    <div className="card" style={{
      padding: '16px 18px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: 0,
      transition: 'border-color 0.2s',
      borderTop: `2px solid ${color}`,
    }}>
      {/* Title */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: '#8B949E',
      }}>
        {title}
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px', fontWeight: 700,
            color,
            lineHeight: 1,
            textShadow: `0 0 20px ${color}50`,
          }}>
            {value}
          </div>
          {unit && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', color: '#8B949E',
              marginTop: '3px',
            }}>{unit}</div>
          )}
        </div>

        {/* Sparkline */}
        <div style={{ flexShrink: 0 }}>
          {type === 'bar'
            ? <BarSparkline data={sparkData} color={color} />
            : type === 'conf'
            ? <ConfBar value={parseFloat(value)} color={color} />
            : <Sparkline data={sparkData} color={color} />
          }
        </div>
      </div>

      {/* Delta / sub-label */}
      {delta && (
        <div style={{
          fontSize: '11px',
          color: delta.startsWith('+') ? '#10B981' : delta.startsWith('-') ? '#EF4444' : '#8B949E',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {delta}
        </div>
      )}
    </div>
  );
}
