import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const isHoveringRef = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const onMove = (e: PointerEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const onEnter = () => { isHoveringRef.current = true; };
    const onLeave = () => { isHoveringRef.current = false; };

    window.addEventListener('pointermove', onMove);

    const observer = new MutationObserver(() => {
      const interactives = document.querySelectorAll('button, a, [data-hover], input[type="range"], input[type="checkbox"]');
      interactives.forEach(el => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const initialInteractives = document.querySelectorAll('button, a, [data-hover], input[type="range"], input[type="checkbox"]');
    initialInteractives.forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    let raf: number;
    const animate = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.15;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.15;

      const size = isHoveringRef.current ? 36 : 6;
      const bg = isHoveringRef.current ? 'transparent' : 'rgba(56, 189, 248, 0.8)';
      const border = isHoveringRef.current ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid transparent';

      cursor.style.transform = `translate(${posRef.current.x - size / 2}px, ${posRef.current.y - size / 2}px)`;
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
      cursor.style.background = bg;
      cursor.style.border = border;

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'rgba(56, 189, 248, 0.8)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'width 0.3s, height 0.3s, background 0.3s, border 0.3s',
        mixBlendMode: 'screen',
      }}
    />
  );
}
