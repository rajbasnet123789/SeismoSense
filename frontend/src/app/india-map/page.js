'use client';
import { useEffect, useRef, useState } from 'react';
import { useLiveData } from '@/context/LiveDataContext';

const INDIAN_STATIONS = [
  { code: 'SHL', lat: 25.5668, lon: 91.8559, name: 'Shillong, Meghalaya' },
  { code: 'MNC', lat: 8.2815,  lon: 73.0598, name: 'Minicoy, Lakshadweep' },
];

const SHL_LAT = INDIAN_STATIONS[0].lat;
const SHL_LON = INDIAN_STATIONS[0].lon;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stationIcon(L, code, color, gradient) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 30px; height: 30px;
      background: linear-gradient(135deg, ${gradient});
      border: 2px solid #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px ${color}99;
      font-size: 8px; font-weight: 700; color: #fff;
      font-family: 'JetBrains Mono', monospace;
    ">${code}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapView() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const linesRef = useRef([]);
  const [userPos, setUserPos] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const LRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(L => {
      if (cancelled) return;
      LRef.current = L;
      setLeafletReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!leafletReady || mapInstanceRef.current) return;
    const L = LRef.current;

    const map = L.map(mapRef.current, {
      center: [20, 80],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const stationColors = [
      { code: 'SHL', color: '#EF4444', grad: '#EF4444, #DC2626' },
      { code: 'MNC', color: '#10B981', grad: '#10B981, #059669' },
    ];

    INDIAN_STATIONS.forEach((s, i) => {
      const sc = stationColors[i];
      const icon = stationIcon(L, s.code, sc.color, sc.grad);
      const marker = L.marker([s.lat, s.lon], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
          <strong style="color: ${sc.color};">${s.code} Station</strong><br/>
          ${s.name}<br/>
          <span style="color: #666;">${s.lat.toFixed(4)}°N, ${s.lon.toFixed(4)}°E</span>
        </div>
      `);
      markersRef.current[s.code] = marker;
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = LRef.current;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserPos({ lat, lon });

        const map = mapInstanceRef.current;
        if (!map) return;

        if (markersRef.current.user) {
          map.removeLayer(markersRef.current.user);
        }

        const userIcon = L.divIcon({
          className: '',
          html: `<div style="
            width: 28px; height: 28px;
            background: linear-gradient(135deg, #2196F3, #1976D2);
            border: 2px solid #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(33,150,243,0.6);
            font-size: 10px; color: #fff;
            font-family: 'JetBrains Mono', monospace;
          ">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);
        const distToShl = haversine(lat, lon, SHL_LAT, SHL_LON);
        userMarker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
            <strong style="color: #2196F3;">Your Location</strong><br/>
            <span style="color: #666;">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</span><br/>
            <span style="color: #10B981;">${distToShl.toFixed(1)} km from SHL</span>
          </div>
        `);
        markersRef.current.user = userMarker;

        linesRef.current.forEach(l => map.removeLayer(l));
        linesRef.current = [];

        INDIAN_STATIONS.forEach(s => {
          const line = L.polyline([[lat, lon], [s.lat, s.lon]], {
            color: s.code === 'SHL' ? '#EF4444' : '#10B981',
            weight: 1.5,
            opacity: 0.4,
            dashArray: '6, 6',
          }).addTo(map);
          linesRef.current.push(line);
        });

        const allLats = [lat, ...INDIAN_STATIONS.map(s => s.lat)];
        const allLons = [lon, ...INDIAN_STATIONS.map(s => s.lon)];
        const bounds = L.latLngBounds(
          [Math.min(...allLats), Math.min(...allLons)],
          [Math.max(...allLats), Math.max(...allLons)]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
      },
      () => {
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([20, 80], 5);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [leafletReady]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
  );
}

export default function IndiaMapPage() {
  const { wsConnected } = useLiveData();

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: '#E6EDF3', marginBottom: '4px' }}>
            India Map — Seismic Stations
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E' }}>
            2 IN stations <span style={{ color: '#8B949E' }}>·</span> SHL, MNC <span style={{ color: '#8B949E' }}>·</span> distances
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="badge badge-red" style={{ fontSize: '9px' }}>SHL</div>
          <div className="badge badge-green" style={{ fontSize: '9px' }}>MNC</div>
          <div className="badge badge-blue" style={{ fontSize: '9px' }}>You</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
        <div className="card" style={{ flex: 1, padding: '4px', overflow: 'hidden', position: 'relative' }}>
          <MapView />
        </div>

        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Indian Stations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {INDIAN_STATIONS.map((s, i) => {
                const colors = ['#EF4444', '#F59E0B', '#10B981'];
                return (
                  <div key={s.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] }} />
                      <span style={{ color: colors[i], fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{s.code}</span>
                    </div>
                    <span style={{ color: '#8B949E', fontSize: '10px', textAlign: 'right' }}>{s.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Your Distances</div>
            <LocationDistance />
          </div>

          <div className="card" style={{ padding: '14px 16px', flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#484F58', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Seismic Activity</div>
            <div style={{ fontSize: '12px', color: '#8B949E', lineHeight: '1.6' }}>
              <p>IN network stations monitor seismic activity across India's highest-risk zones.</p>
              <p style={{ marginTop: '8px' }}>SHL (Shillong Plateau, Zone V), MNC (Lakshadweep, Zone III).</p>
              <p style={{ marginTop: '8px', color: wsConnected ? '#10B981' : '#F59E0B' }}>
                {wsConnected ? '● Live feed active' : '● Awaiting data stream'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationDistance() {
  const [dist, setDist] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserPos({ lat, lon });
        setDist(haversine(lat, lon, SHL_LAT, SHL_LON));
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  if (error) {
    return (
      <div style={{ fontSize: '12px', color: '#F59E0B' }}>
        Could not determine your location.<br/>
        <span style={{ fontSize: '10px', color: '#484F58' }}>Enable location services and reload.</span>
      </div>
    );
  }

  if (!userPos || !dist) {
    return <div style={{ fontSize: '12px', color: '#8B949E' }}>Detecting your location…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: '#8B949E' }}>Your Lat</span>
        <span style={{ color: '#2196F3', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{userPos.lat.toFixed(4)}°N</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: '#8B949E' }}>Your Lon</span>
        <span style={{ color: '#2196F3', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{userPos.lon.toFixed(4)}°E</span>
      </div>
      <div style={{ height: '1px', background: '#21262D', margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: '#8B949E' }}>Distance to SHL</span>
        <span style={{ color: '#10B981', fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700 }}>{dist.toFixed(1)} km</span>
      </div>
    </div>
  );
}
