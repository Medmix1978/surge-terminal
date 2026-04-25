import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useTrading } from '@/context/TradingContext';
import StatusIndicator from '@/components/StatusIndicator';
import TogglePill from '@/components/TogglePill';
import Slider from '@/components/Slider';
import CheckboxItem from '@/components/CheckboxItem';

export default function LeftPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const ctx = useTrading();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { x: -340, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await ctx.saveConfig();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pairs = ['ETH/USD', 'BTC/USD'];
  const strategyOptions = ['Momentum', 'Breakout', 'Mean Reversion'];
  const allNewsSources = ['CryptoPanic', 'Twitter/X', 'Kraken API', 'Economic Calendar'];

  const allocationPercent = ctx.tradingAllocation > 0 && ctx.usdBalance > 0
    ? Math.min((ctx.tradingAllocation / ctx.usdBalance) * 100, 100)
    : 0;

  return (
    <div
      ref={panelRef}
      className="fixed left-6 top-[80px] bottom-6 w-[320px] z-10 flex flex-col rounded-lg border border-[rgba(7,30,46,0.4)] bg-[rgba(7,30,46,0.85)] backdrop-blur-[16px] overflow-y-auto transition-colors hover:border-[rgba(56,189,248,0.3)]"
      style={{ transitionDuration: '400ms', opacity: 0 }}
    >
      <div className="p-5 flex-1">
        {/* Bot Status */}
        <div className="mb-6 flex items-center justify-between">
          <StatusIndicator label="ACTIVE" />
          {ctx.loading && (
            <span className="font-mono text-[10px] text-[#38BDF8] animate-pulse">Syncing...</span>
          )}
        </div>

        {/* USD Balance */}
        <div className="mb-6 p-3 rounded-md bg-[rgba(240,245,248,0.04)] border border-[rgba(240,245,248,0.06)]">
          <div className="font-mono text-[10px] text-[rgba(240,245,248,0.5)] uppercase tracking-wider mb-1">Kraken USD Balance</div>
          <div className="font-archivo text-[20px] font-extrabold text-[#F0F5F8]">
            ${ctx.usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Auto Trade Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] uppercase tracking-wider">Auto Trading</span>
            <button
              data-hover
              onClick={() => ctx.setAutoTrade(!ctx.autoTrade)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 cursor-none ${
                ctx.autoTrade ? 'bg-[#4ADE80]' : 'bg-[rgba(240,245,248,0.15)]'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                ctx.autoTrade ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <p className={`font-mono text-[10px] ${ctx.autoTrade ? 'text-[#4ADE80]' : 'text-[rgba(240,245,248,0.4)]'}`}>
            {ctx.autoTrade
              ? '⚠️ Bot will automatically execute signals within your allocation'
              : 'Bot generates signals but will not execute trades automatically'}
          </p>
        </div>

        {/* Trading Allocation */}
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Trading Allocation
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-archivo text-[20px] font-extrabold text-[#38BDF8]">
              ${ctx.tradingAllocation.toLocaleString()}
            </span>
            <span className="font-mono text-[10px] text-[rgba(240,245,248,0.5)]">
              / ${ctx.usdBalance.toLocaleString()} ({allocationPercent.toFixed(0)}%)
            </span>
          </div>
          <Slider
            label="Max Capital to Deploy"
            value={ctx.tradingAllocation}
            min={100}
            max={Math.max(Math.floor(ctx.usdBalance), 5000)}
            step={100}
            unit=" USD"
            onChange={ctx.setTradingAllocation}
          />
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[10px] text-[rgba(240,245,248,0.4)]">
              Used: ${ctx.allocationUsed.toFixed(2)}
            </span>
            <span className="font-mono text-[10px] text-[#4ADE80]">
              Free: ${ctx.allocationAvailable.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Asset Selection */}
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Trading Pairs
          </div>
          <div className="flex gap-2">
            {pairs.map(pair => (
              <TogglePill
                key={pair}
                label={pair}
                active={ctx.activePairs.includes(pair)}
                onClick={() => {
                  if (ctx.activePairs.includes(pair)) {
                    if (ctx.activePairs.length > 1) ctx.setActivePairs(ctx.activePairs.filter(p => p !== pair));
                  } else {
                    ctx.setActivePairs([...ctx.activePairs, pair]);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Strategy Mode */}
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Strategy
          </div>
          <button
            data-hover
            onClick={() => ctx.setStrategyMode('News-Driven')}
            className="w-full text-left font-mono text-[12px] font-medium px-3 py-2 mb-2 rounded-lg border bg-[rgba(56,189,248,0.1)] border-[#38BDF8] text-[#38BDF8] transition-all duration-200 cursor-none"
          >
            News-Driven
          </button>
          <div className="flex flex-wrap gap-2">
            {strategyOptions.map(opt => (
              <TogglePill
                key={opt}
                label={opt}
                active={ctx.strategies.includes(opt)}
                onClick={() => ctx.toggleStrategy(opt)}
              />
            ))}
          </div>
        </div>

        {/* Risk Controls */}
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            Risk Controls
          </div>
          <Slider label="Max Position Size" value={ctx.maxPositionSize} unit="%" onChange={ctx.setMaxPositionSize} />
          <Slider label="Stop Loss" value={ctx.stopLoss} onChange={ctx.setStopLoss} />
          <Slider label="Take Profit" value={ctx.takeProfit} onChange={ctx.setTakeProfit} />
        </div>

        {/* News Sources */}
        <div className="mb-6">
          <div className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] mb-3 uppercase tracking-wider">
            News Sources
          </div>
          {allNewsSources.map(source => (
            <CheckboxItem
              key={source}
              label={source}
              checked={!!ctx.newsSources[source]}
              onChange={() => ctx.toggleNewsSource(source)}
            />
          ))}
        </div>

        {/* Save Button */}
        <button
          data-hover
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg font-mono text-[12px] font-medium transition-all duration-200 cursor-none
            bg-[rgba(56,189,248,0.15)] border border-[#38BDF8] text-[#38BDF8]
            hover:bg-[rgba(56,189,248,0.25)] disabled:opacity-50"
        >
          {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE CONFIGURATION'}
        </button>
      </div>
    </div>
  );
}
