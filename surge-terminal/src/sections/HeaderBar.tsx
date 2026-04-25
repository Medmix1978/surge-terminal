import { useState } from 'react';
import { useTrading } from '@/context/TradingContext';
import SetupModal from '@/components/SetupModal';

export default function HeaderBar() {
  const { wsConnected, apiConnected } = useTrading();
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-10 pointer-events-none">
        <div className="h-px w-full bg-[rgba(56,189,248,0.15)]" />
        <div className="px-6 pt-5 flex items-start justify-between">
          <div>
            <div className="font-archivo text-[12px] font-extrabold tracking-[0.15em] text-[#F0F5F8]">
              SURGE
            </div>
            <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mt-0.5">
              AUTONOMOUS TRADING SYSTEM — KRAKEN PRO
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 pointer-events-auto">
            {!apiConnected && (
              <button
                data-hover
                onClick={() => setShowSetup(true)}
                className="px-3 py-1.5 rounded-full font-mono text-[10px] font-medium border border-[#38BDF8] text-[#38BDF8] bg-[rgba(56,189,248,0.1)] hover:bg-[rgba(56,189,248,0.2)] transition-all cursor-none"
              >
                🔗 CONNECT KRAKEN
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-[#4ADE80]' : 'bg-[#F87171]'}`} style={{ boxShadow: apiConnected ? '0 0 6px #4ADE80' : '0 0 6px #F87171' }} />
              <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)]">API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-[#4ADE80]' : 'bg-[#F87171]'}`} style={{ boxShadow: wsConnected ? '0 0 6px #4ADE80' : '0 0 6px #F87171' }} />
              <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)]">WS</span>
            </div>
          </div>
        </div>
      </div>

      {showSetup && (
        <SetupModal
          onClose={() => setShowSetup(false)}
          onConnected={() => window.location.reload()}
        />
      )}
    </>
  );
}
