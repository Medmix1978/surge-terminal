import { useEffect, useRef } from 'react';

const data = [
  11800, 11920, 11850, 12010, 12150, 12080, 12200, 12130, 12300, 12250,
  12400, 12320, 12500, 12450, 12600, 12580, 12700, 12650, 12800, 12720,
  12900, 12850, 12700, 12850, 12950, 12880, 13000, 12920, 13100, 13050,
  12847, 12700, 12850, 12950, 12800, 12950, 12850, 13000, 12950, 12850,
  12750, 12850, 12750, 12850, 12700, 12850, 12750, 12847,
];

export default function SparklineChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = 4;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const getX = (i: number) => padding + (i / (data.length - 1)) * (w - padding * 2);
    const getY = (v: number) => h - padding - ((v - min) / range) * (h - padding * 2);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1]);
      const currX = getX(i);
      const currY = getY(data[i]);
      const cpx1 = prevX + (currX - prevX) * 0.4;
      const cpx2 = prevX + (currX - prevX) * 0.6;
      ctx.bezierCurveTo(cpx1, prevY, cpx2, currY, currX, currY);
    }
    ctx.lineTo(getX(data.length - 1), h);
    ctx.lineTo(getX(0), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1]);
      const currX = getX(i);
      const currY = getY(data[i]);
      const cpx1 = prevX + (currX - prevX) * 0.4;
      const cpx2 = prevX + (currX - prevX) * 0.6;
      ctx.bezierCurveTo(cpx1, prevY, cpx2, currY, currX, currY);
    }
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 80 }}
    />
  );
}
