interface SignalBadgeProps {
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

const colors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ADE80' },
  MEDIUM: { bg: 'rgba(250, 204, 21, 0.15)', text: '#FACC15' },
  HIGH: { bg: 'rgba(248, 113, 113, 0.15)', text: '#F87171' },
};

export default function SignalBadge({ impact }: SignalBadgeProps) {
  const c = colors[impact];
  return (
    <span
      className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {impact}
    </span>
  );
}
