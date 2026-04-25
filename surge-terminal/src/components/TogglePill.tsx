interface TogglePillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}

export default function TogglePill({ label, active, onClick, accent }: TogglePillProps) {
  return (
    <button
      data-hover
      onClick={onClick}
      className={`
        font-mono text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 cursor-none
        ${active
          ? (accent
            ? 'bg-[rgba(56,189,248,0.15)] border border-[#38BDF8] text-[#38BDF8]'
            : 'bg-[rgba(56,189,248,0.15)] border border-[#38BDF8] text-[#38BDF8]')
          : 'bg-[rgba(240,245,248,0.08)] border border-transparent text-[rgba(240,245,248,0.65)] hover:text-[#F0F5F8]'
        }
      `}
    >
      {label}
    </button>
  );
}
