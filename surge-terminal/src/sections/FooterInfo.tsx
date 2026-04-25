export default function FooterInfo() {
  return (
    <div className="fixed bottom-6 right-6 z-10 text-right">
      <div className="flex items-center gap-2 justify-end">
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{
            background: '#4ADE80',
            boxShadow: '0 0 6px #4ADE80',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }}
        />
        <span className="font-mono text-[11px] text-[rgba(240,245,248,0.65)]">System: ONLINE</span>
      </div>
      <div className="font-mono text-[10px] text-[rgba(240,245,248,0.4)] mt-1">
        Latency: 142ms | Kraken API v2
      </div>
    </div>
  );
}
