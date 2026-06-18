'use client';
import { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import WaveformPanel from '@/components/WaveformPanel';
import AIInferencePanel from '@/components/AIInferencePanel';
import RecentTriggers from '@/components/RecentTriggers';
import { api } from '@/lib/api';

function confidenceSpark(data) {
  if (!data || data.length < 2) return Array(10).fill(0);
  return data.slice(-10).map(p => Math.round(p.p_wave * 100) / 100);
}

function classifyPWave(val) {
  if (val < 0.2) return 'Noise';
  if (val < 0.5) return 'Low';
  if (val >= 0.75) return 'Earthquake';
  return 'Medium';
}

function levelFromConf(val) {
  if (val >= 80) return 'critical';
  if (val >= 60) return 'high';
  if (val >= 30) return 'medium';
  return 'low';
}

function getDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function getTimeStr(d) {
  if (!d) return '--:--:--';
  if (typeof d === 'string') return d.slice(11, 19);
  if (d instanceof Date) return d.toISOString().slice(11, 19);
  return '--:--:--';
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: 0 }}>
      <div style={{ height: '10px', width: '60%', background: '#1E2430', borderRadius: '3px', marginBottom: '12px' }} />
      <div style={{ height: '28px', width: '40%', background: '#1E2430', borderRadius: '3px', marginBottom: '8px' }} />
      <div style={{ height: '10px', width: '80%', background: '#1E2430', borderRadius: '3px' }} />
    </div>
  );
}

export default function DashboardPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const data = await api.getPredictions(100);
        if (mounted) setPredictions(data);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const recent = predictions.slice(0, 10);
  const sparkConfData = confidenceSpark(predictions);

  const hasData = predictions.length > 0;
  const avgConf = hasData
    ? (predictions.reduce((s, p) => s + p.p_wave, 0) / predictions.length * 100)
    : 0;
  const maxPWave = hasData ? Math.max(...predictions.map(p => p.p_wave)) : 0;
  const estMag = maxPWave > 0 ? (maxPWave * 4).toFixed(1) : '—';

  const todayStr = new Date().toISOString().slice(0, 10);
  const eventsToday = hasData
    ? predictions.filter(p => getDateStr(p.created_at) === todayStr).length
    : 0;

  const recentTriggers = hasData
    ? predictions
        .filter(p => p.p_wave > 0.3)
        .slice(0, 4)
        .map(p => ({
          time: getTimeStr(p.created_at),
          station: p.station,
          mag: p.p_wave > 0.5 ? (p.p_wave * 4).toFixed(1) + ' Mw' : '—',
          conf: p.p_wave * 100,
          level: levelFromConf(p.p_wave * 100),
          type: classifyPWave(p.p_wave),
        }))
    : [];

  const latestPred = predictions[0] || null;
  const eqProb = latestPred ? +(latestPred.p_wave * 100).toFixed(1) : 0;
  const noiseProb = latestPred ? +((1 - latestPred.p_wave) * 80).toFixed(1) : 0;
  const explProb = latestPred ? +((1 - latestPred.p_wave) * 20).toFixed(1) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', gap: '14px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
          <div className="card" style={{ flex: 3, padding: '16px', minHeight: '300px' }}>
            <div style={{ height: '10px', width: '40%', background: '#1E2430', borderRadius: '3px', marginBottom: '16px' }} />
            <div style={{ height: '200px', background: '#1E2430', borderRadius: '4px' }} />
          </div>
          <div className="card" style={{ flex: 1, padding: '16px', minHeight: '300px' }}>
            <div style={{ height: '10px', width: '60%', background: '#1E2430', borderRadius: '3px', marginBottom: '16px' }} />
            <div style={{ height: '120px', width: '120px', background: '#1E2430', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#8B949E' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#EF4444' }}>{error}</span>
        <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ fontSize: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '18px', height: '100%', minHeight: 0 }}>

      {/* ── Stat Cards Row ── */}
      <div style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
        <StatCard
          title="Magnitude (Est.)"
          value={estMag}
          unit="Mw · Richter Scale"
          color="#10B981"
          sparkData={sparkConfData}
          delta={hasData ? `${predictions.length} total records` : 'No data'}
        />
        <StatCard
          title="AI Confidence"
          value={avgConf ? avgConf.toFixed(1) : '—'}
          unit="% · EQTransformer"
          color="#2196F3"
          type="conf"
          sparkData={sparkConfData}
          delta={avgConf > 0 ? `${(avgConf - 50).toFixed(1)}% from baseline` : 'Awaiting data'}
        />
        <StatCard
          title="Active Stations"
          value={String(new Set(predictions.map(p => p.station)).size)}
          unit="stations reporting"
          color="#E6EDF3"
          sparkData={sparkConfData}
          delta={hasData ? 'Streaming live' : 'Waiting for pipeline'}
        />
        <StatCard
          title="Events Today"
          value={String(eventsToday || (hasData ? 0 : '—'))}
          unit="triggers logged"
          color="#F59E0B"
          type="bar"
          sparkData={hasData ? predictions.slice(0, 10).map(p => Math.round(p.p_wave * 100)).reverse() : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
          delta={eventsToday > 0 ? `${eventsToday} today` : hasData ? 'No events today' : 'No data'}
        />
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>

        {/* Waveform panel — 75% */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <WaveformPanel predictions={predictions} />
        </div>

        {/* Right panel — 25% */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '220px', maxWidth: '260px' }}>
          <AIInferencePanel eqProb={eqProb} noiseProb={noiseProb} explProb={explProb} />
          <RecentTriggers triggers={recentTriggers} />
        </div>
      </div>
    </div>
  );
}
