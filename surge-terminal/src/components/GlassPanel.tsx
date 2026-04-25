import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  slideDirection?: 'left' | 'right';
  delay?: number;
}

export default function GlassPanel({ children, className = '', slideDirection, delay = 0.3 }: GlassPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current || !slideDirection) return;
    const panel = panelRef.current;
    const fromX = slideDirection === 'left' ? -340 : 340;
    gsap.fromTo(panel,
      { x: fromX, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay }
    );
  }, [slideDirection, delay]);

  return (
    <div
      ref={panelRef}
      className={`rounded-lg border border-[rgba(7,30,46,0.4)] bg-[rgba(7,30,46,0.85)] backdrop-blur-[16px] transition-colors hover:border-[rgba(56,189,248,0.3)] ${className}`}
      style={{ transitionDuration: '400ms', ...(slideDirection ? { opacity: 0 } : {}) }}
    >
      {children}
    </div>
  );
}
