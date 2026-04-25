import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function HeroOverlay() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sublineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const headline = headlineRef.current;
    const subline = sublineRef.current;
    if (!headline || !subline) return;

    // Split headline into individual characters
    const text = headline.textContent || '';
    headline.innerHTML = '';
    const chars: HTMLSpanElement[] = [];
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      headline.appendChild(span);
      chars.push(span);
    }

    gsap.to(chars, {
      y: 0,
      opacity: 1,
      stagger: 0.02,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.5,
    });

    gsap.fromTo(subline,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 1.0 }
    );
  }, []);

  return (
    <div className="fixed bottom-12 left-12 z-10 pointer-events-none">
      <h1
        ref={headlineRef}
        className="font-archivo font-extrabold text-[#F0F5F8] tracking-[-0.02em] leading-[1.05]"
        style={{
          fontSize: 'clamp(48px, 6vw, 88px)',
          textShadow: '0 0 40px rgba(56, 189, 248, 0.3)',
        }}
      >
        PRECISION EXECUTION
      </h1>
      <p
        ref={sublineRef}
        className="text-[18px] text-[rgba(240,245,248,0.65)] mt-3"
        style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 400 }}
      >
        Autonomous strategies. News-aware decisions.
      </p>
    </div>
  );
}
