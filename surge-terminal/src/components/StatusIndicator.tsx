interface StatusIndicatorProps {
  label: string;
  color?: string;
  small?: boolean;
}

export default function StatusIndicator({ label, color = '#4ADE80', small = false }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full inline-block ${small ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: 'pulse-dot 2s ease-in-out infinite',
        }}
      />
      <span className={`font-mono text-[rgba(240,245,248,0.65)] ${small ? 'text-[10px]' : 'text-[11px]'}`}>{label}</span>
    </div>
  );
}
