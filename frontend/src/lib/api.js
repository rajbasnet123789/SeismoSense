const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined'
    ? (window.location.port === '8000' ? '' : '/api')
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '/api'));

async function request(endpoint, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('ss_token');
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  login(email, password) {
    return request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });
  },

  signup(data) {
    return request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getPredictions(limit = 100, offset = 0) {
    return request(`/predictions?limit=${limit}&offset=${offset}`);
  },

  getPredictionsByStation(station, limit = 100, offset = 0) {
    return request(`/predictions/station/${station}?limit=${limit}&offset=${offset}`);
  },

  getMe() {
    return request('/users/me');
  },

  healthCheck() {
    return request('/health');
  },

  getStations() {
    return request('/stations');
  },

  getAlerts(limit = 20) {
    return request(`/alerts?limit=${limit}`);
  },

  getWaveforms(station, limit = 5) {
    return request(`/waveforms/${encodeURIComponent(station)}?limit=${limit}`);
  },
};
