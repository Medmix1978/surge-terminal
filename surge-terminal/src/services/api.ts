const API_BASE = ''; // Use relative URLs — works when frontend & backend are same origin

async function request(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Market
  getTickers: (pairs: string[]) => request(`/api/market/ticker?pairs=${pairs.join(',')}`),
  getOHLC: (pair: string, interval?: number) => request(`/api/market/ohlc?pair=${pair}${interval ? `&interval=${interval}` : ''}`),
  getPortfolio: () => request('/api/market/portfolio'),
  getBalance: () => request('/api/market/balance'),

  // Trading
  getOrders: () => request('/api/trading/orders'),
  placeOrder: (body: any) => request('/api/trading/order', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (txid: string) => request('/api/trading/cancel', { method: 'POST', body: JSON.stringify({ txid }) }),
  getHistory: (limit?: number) => request(`/api/trading/history${limit ? `?limit=${limit}` : ''}`),

  // Signals
  getSignals: (limit?: number) => request(`/api/signals${limit ? `?limit=${limit}` : ''}`),

  // News
  getNews: (refresh?: boolean) => request(`/api/news${refresh ? '?refresh=true' : ''}`),
  refreshNews: () => request('/api/news/refresh', { method: 'POST' }),

  // Config
  getConfig: () => request('/api/config'),
  updateConfig: (body: any) => request('/api/config', { method: 'POST', body: JSON.stringify(body) }),

  // Setup / Connect Kraken
  getSetup: () => request('/api/setup'),
  postSetup: (body: { kraken_api_key: string; kraken_api_secret: string; cryptopanic_key?: string }) =>
    request('/api/setup', { method: 'POST', body: JSON.stringify(body) }),

  // Health
  getHealth: () => request('/api/health'),
};
