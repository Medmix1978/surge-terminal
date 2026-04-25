interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export default function Slider({ label, value, min = 0, max = 100, step = 0.5, unit = '%', onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-mono text-[11px] text-[rgba(240,245,248,0.65)]">{label}</span>
        <span className="font-mono text-[11px] text-[#38BDF8]">{value}{unit}</span>
      </div>
      <div className="relative h-1.5 bg-[rgba(240,245,248,0.08)] rounded-full">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-[#38BDF8]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-none"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.6)] pointer-events-none"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
}
