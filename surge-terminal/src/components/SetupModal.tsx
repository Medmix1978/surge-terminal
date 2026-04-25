import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export default function SetupModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [cryptoKey, setCryptoKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    api.getHealth().then(() => setBackendReady(true)).catch(() => setBackendReady(false));
  }, []);

  const handleSubmit = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Both API Key and Private Key are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.postSetup({
        kraken_api_key: apiKey.trim(),
        kraken_api_secret: apiSecret.trim(),
        cryptopanic_key: cryptoKey.trim() || undefined,
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onConnected();
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Failed to connect');
      }
    } catch (err: any) {
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Backend server not reachable. Make sure the Surge Terminal API is running. Run: cd server && node index.js');
      } else {
        setError(err.message || 'Connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,12,18,0.85)] backdrop-blur-[12px]">
      <div className="w-[440px] rounded-lg border border-[rgba(56,189,248,0.3)] bg-[rgba(7,30,46,0.95)] p-6 shadow-[0_0_60px_rgba(56,189,248,0.15)]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-archivo text-[18px] font-extrabold text-[#F0F5F8]">Connect Kraken Pro</h2>
          <button data-hover onClick={onClose} className="text-[rgba(240,245,248,0.5)] hover:text-[#F0F5F8] text-[20px] cursor-none">×</button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[rgba(74,222,128,0.15)] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="font-mono text-[14px] text-[#4ADE80]">Connected to Kraken Pro</p>
            <p className="font-mono text-[11px] text-[rgba(240,245,248,0.5)] mt-2">Live market data active</p>
          </div>
        ) : (
          <>
            {backendReady === false && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                <p className="font-mono text-[11px] text-[#F87171] font-medium">⚠️ Backend Offline</p>
                <p className="font-mono text-[10px] text-[rgba(240,245,248,0.5)] mt-1">
                  The API server is not running. The dashboard will show simulated data until you start it.
                  Run: <code className="text-[#38BDF8]">cd server && node index.js</code>
                </p>
              </div>
            )}

            <p className="text-[13px] text-[rgba(240,245,248,0.65)] mb-5 leading-relaxed">
              Enter your Kraken Pro API credentials to switch from simulated to live trading data.
              <a href="https://pro.kraken.com/account/api" target="_blank" rel="noopener" className="text-[#38BDF8] hover:underline ml-1">Get keys →</a>
            </p>

            <div className="mb-4">
              <label className="block font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-2 uppercase tracking-wider">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Kraken API Key"
                className="w-full bg-[rgba(240,245,248,0.06)] border border-[rgba(240,245,248,0.12)] rounded-lg px-3 py-2.5 font-mono text-[12px] text-[#F0F5F8] placeholder:text-[rgba(240,245,248,0.3)] focus:border-[#38BDF8] focus:outline-none transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-2 uppercase tracking-wider">Private Key</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Paste your Kraken Private Key"
                className="w-full bg-[rgba(240,245,248,0.06)] border border-[rgba(240,245,248,0.12)] rounded-lg px-3 py-2.5 font-mono text-[12px] text-[#F0F5F8] placeholder:text-[rgba(240,245,248,0.3)] focus:border-[#38BDF8] focus:outline-none transition-colors"
              />
            </div>

            <div className="mb-5">
              <label className="block font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-2 uppercase tracking-wider">CryptoPanic Key <span className="text-[rgba(240,245,248,0.3)]">(Optional)</span></label>
              <input
                type="password"
                value={cryptoKey}
                onChange={(e) => setCryptoKey(e.target.value)}
                placeholder="For live news aggregation"
                className="w-full bg-[rgba(240,245,248,0.06)] border border-[rgba(240,245,248,0.12)] rounded-lg px-3 py-2.5 font-mono text-[12px] text-[#F0F5F8] placeholder:text-[rgba(240,245,248,0.3)] focus:border-[#38BDF8] focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
                <p className="font-mono text-[11px] text-[#F87171]">{error}</p>
              </div>
            )}

            <button
              data-hover
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-lg font-mono text-[12px] font-semibold tracking-wider transition-all duration-200 cursor-none
                bg-[rgba(56,189,248,0.15)] border border-[#38BDF8] text-[#38BDF8]
                hover:bg-[rgba(56,189,248,0.25)] disabled:opacity-40"
            >
              {loading ? 'CONNECTING...' : 'CONNECT TO KRAKEN PRO'}
            </button>

            <p className="text-center mt-4 font-mono text-[10px] text-[rgba(240,245,248,0.3)]">
              Keys are stored encrypted on your server. Never shared externally.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
