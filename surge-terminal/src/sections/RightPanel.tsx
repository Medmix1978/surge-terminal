import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useTrading } from '@/context/TradingContext';
import SignalBadge from '@/components/SignalBadge';
import SparklineChart from '@/components/SparklineChart';

export default function RightPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const ctx = useTrading();

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { x: 340, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  const isPnlPositive = ctx.unrealizedPnl >= 0;
  const allocationPct = ctx.tradingAllocation > 0 ? (ctx.allocationUsed / ctx.tradingAllocation * 100) : 0;

  const getLivePrice = (pair: string) => {
    const ticker = ctx.tickerData.find((t: any) => {
      if (pair === 'ETH/USD') return t.pair.includes('ETH');
      if (pair === 'BTC/USD') return t.pair.includes('XBT');
      return false;
    });
    return ticker?.last;
  };

  return (
    <div
      ref={panelRef}
      className="fixed right-6 top-[80px] bottom-6 w-[320px] z-10 flex flex-col rounded-lg border border-[rgba(7,30,46,0.4)] bg-[rgba(7,30,46,0.85)] backdrop-blur-[16px] overflow-y-auto transition-colors hover:border-[rgba(56,189,248,0.3)]"
      style={{ transitionDuration: '400ms', opacity: 0 }}
    >
      <div className="p-5 flex-1">
        {/* Portfolio Summary */}
        <div className="mb-5">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-2 uppercase tracking-wider">
            Total Equity
          </div>
          <div className="font-archivo text-[24px] font-extrabold text-[#F0F5F8] tracking-tight">
            ${ctx.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className={`font-mono text-[12px] mt-1 ${isPnlPositive ? 'text-[#38BDF8]' : 'text-[#F87171]'}`}>
            {isPnlPositive ? '+' : ''}${ctx.unrealizedPnl.toFixed(2)} ({isPnlPositive ? '+' : ''}{(ctx.unrealizedPnl / ctx.totalEquity * 100).toFixed(2)}%)
          </div>
        </div>

        {/* USD Balance & Allocation */}
        <div className="mb-5 p-3 rounded-md bg-[rgba(240,245,248,0.04)] border border-[rgba(240,245,248,0.06)]">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)] uppercase tracking-wider">USD Balance</span>
            <span className="font-archivo text-[14px] font-extrabold text-[#F0F5F8]">${ctx.usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)]">Allocated</span>
            <span className="font-mono text-[11px] text-[#38BDF8]">${ctx.tradingAllocation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)]">In Use</span>
            <span className="font-mono text-[11px] text-[#FACC15]">${ctx.allocationUsed.toFixed(2)}</span>
          </div>
          <div className="w-full h-1.5 bg-[rgba(240,245,248,0.08)] rounded-full mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(allocationPct, 100)}%`,
                background: allocationPct > 90 ? '#F87171' : allocationPct > 70 ? '#FACC15' : '#4ADE80',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px] text-[rgba(240,245,248,0.3)]">{allocationPct.toFixed(1)}% used</span>
            <span className="font-mono text-[9px] text-[#4ADE80]">${ctx.allocationAvailable.toFixed(2)} free</span>
          </div>
          {ctx.autoTrade && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              <span className="font-mono text-[9px] text-[#4ADE80]">Auto-trading active</span>
            </div>
          )}
        </div>

        {/* Live Ticker */}
        {ctx.tickerData.length > 0 && (
          <div className="mb-5">
            <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
              Live Prices
            </div>
            {ctx.tickerData.map((t: any, i: number) => (
              <div key={i} className="flex justify-between items-center mb-2 p-2 rounded bg-[rgba(240,245,248,0.04)]">
                <span className="font-mono text-[11px] text-[#F0F5F8]">{t.pair}</span>
                <div className="text-right">
                  <span className="font-mono text-[12px] text-[#F0F5F8]">${t.last?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`font-mono text-[10px] ml-2 ${t.changePercent >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                    {t.changePercent >= 0 ? '+' : ''}{t.changePercent?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Open Positions */}
        <div className="mb-5">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Open Positions
          </div>
          {ctx.openPositions.map((pos, i) => {
            const livePrice = getLivePrice(pos.pair);
            const displayPrice = livePrice || pos.currentPrice;
            const priceDiff = displayPrice - pos.entryPrice;
            const isProfit = priceDiff >= 0;
            return (
              <div key={i} className="mb-3 p-3 rounded-md bg-[rgba(240,245,248,0.04)] border border-[rgba(240,245,248,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[12px] font-medium text-[#F0F5F8]">{pos.pair}</span>
                  <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    pos.side === 'BUY' ? 'bg-[rgba(74,222,128,0.15)] text-[#4ADE80]' : 'bg-[rgba(248,113,113,0.15)] text-[#F87171]'
                  }`}>
                    {pos.side}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-[rgba(240,245,248,0.5)]">
                  <span>Entry: ${pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span>Now: ${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`font-mono text-[11px] font-medium mt-1 ${isProfit ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                  {isProfit ? '+' : ''}${(priceDiff * (pos.pair === 'BTC/USD' ? 0.01 : 0.5)).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Signals */}
        <div className="mb-5">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Recent Signals
          </div>
          {ctx.recentSignals.map((sig, i) => (
            <div key={i} className="mb-3 pb-3 border-b border-[rgba(240,245,248,0.06)] last:border-0 last:mb-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-[rgba(240,245,248,0.4)]">
                  {new Date(sig.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <SignalBadge impact={sig.impact} />
                {sig.executed && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(74,222,128,0.15)] text-[#4ADE80]">EXECUTED</span>
                )}
              </div>
              <p className="text-[12px] text-[rgba(240,245,248,0.75)] leading-relaxed">{sig.reason}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-[#38BDF8]">{sig.side}</span>
                <span className="font-mono text-[10px] text-[rgba(240,245,248,0.4)]">{sig.source}</span>
                <span className="font-mono text-[10px] text-[rgba(240,245,248,0.4)]">{sig.confidence?.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Chart */}
        <div>
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            24h Performance
          </div>
          <SparklineChart />
        </div>
      </div>
    </div>
  );
}
