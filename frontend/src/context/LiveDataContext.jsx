'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { api } from '@/lib/api';

const LiveDataContext = createContext(null);

const KNOWN_STATIONS_SET = new Set(['SHL', 'MNC']);
const STATION_META = {
  SHL: { network: 'IN', location: 'Shillong, Meghalaya, India', lat: 25.5668, lon: 91.8559 },
  MNC: { network: 'IN', location: 'Minicoy, Lakshadweep, India', lat: 8.2815, lon: 73.0598 },
};

function getWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const wsProto = apiUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const host = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProto}//${host}/ws`;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:8000/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function parseStationCode(raw) {
  if (!raw) return { code: '', network: 'IU' };
  const parts = String(raw).split('.');
  return { code: parts[0], network: parts[1] || 'IU' };
}

export function LiveDataProvider({ children }) {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  const waveformsRef = useRef({});
  const predictionsRef = useRef({});

  const selectedRef = useRef(selectedStation);
  useEffect(() => {
    selectedRef.current = selectedStation;
  }, [selectedStation]);

  useEffect(() => {
    api.healthCheck()
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const wsUrl = getWsUrl();
    let socket;
    let reconnectTimeout;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type !== 'prediction' || !msg.data) return;

          const data = msg.data;
          const { code } = parseStationCode(data.station);

          if (!KNOWN_STATIONS_SET.has(code)) return;

          waveformsRef.current[code] = data;

          const existing = predictionsRef.current[code] || [];
          const filtered = existing.filter(p => p.id !== data.id);
          const updatedPreds = [data, ...filtered].slice(0, 20);
          predictionsRef.current[code] = updatedPreds;

          window.dispatchEvent(new CustomEvent(`seismo:waveform:${code}`, { detail: data }));
          window.dispatchEvent(new CustomEvent(`seismo:predictions:${code}`, { detail: updatedPreds }));

          setStations(prev => {
            const meta = STATION_META[code] || {};
            const exists = prev.some(s => s.code === code);
            if (!exists) {
              return [...prev, {
                code,
                network: meta.network || data.network || 'IN',
                status: 'online',
                last_seen: data.created_at ? new Date(data.created_at).toLocaleTimeString() : '—',
                rate: 100,
                lag: '0s',
                pkts: 100,
                events: data.p_wave > 0.5 ? 1 : 0,
                location: meta.location || null,
                lat: meta.lat || null,
                lon: meta.lon || null,
              }];
            }
            return prev.map(s => {
              if (s.code !== code) return s;
              return {
                ...s,
                status: 'online',
                last_seen: data.created_at ? new Date(data.created_at).toLocaleTimeString() : '—',
                rate: s.rate || 100,
                lag: '0s',
                pkts: Math.min(100, (s.pkts || 95) + 0.5),
                events: (s.events || 0) + (data.p_wave > 0.5 ? 1 : 0),
              };
            });
          });

          if (!selectedRef.current) {
            setSelectedStation(code);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (!closed) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      closed = true;
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const selectStation = useCallback((code) => {
    setSelectedStation(code);
  }, []);

  const getWaveform = useCallback(
    (code) => waveformsRef.current[code || selectedStation] || null,
    [selectedStation],
  );

  const getPredictions = useCallback(
    (code) => predictionsRef.current[code || selectedStation] || [],
    [selectedStation],
  );

  const value = {
    stations,
    loading,
    selectedStation,
    selectStation,
    wsConnected,
    apiConnected,
    isLive: wsConnected && apiConnected,
    getWaveform,
    getPredictions,
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error('useLiveData must be used within LiveDataProvider');
  }
  return ctx;
}