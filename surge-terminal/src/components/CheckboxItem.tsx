interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export default function CheckboxItem({ label, checked, onChange }: CheckboxItemProps) {
  return (
    <label className="flex items-center gap-2.5 mb-2 cursor-none group">
      <div className={`
        w-3.5 h-3.5 rounded border flex items-center justify-center transition-all duration-200
        ${checked
          ? 'bg-[#38BDF8] border-[#38BDF8]'
          : 'bg-transparent border-[rgba(240,245,248,0.25)] group-hover:border-[rgba(240,245,248,0.5)]'
        }
      `}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#030C12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="font-mono text-[11px] text-[rgba(240,245,248,0.65)] select-none">{label}</span>
    </label>
  );
}
