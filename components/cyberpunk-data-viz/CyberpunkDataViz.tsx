'use client';

import { useEffect, useRef, useCallback } from 'react';

function isInsideMap(x: number, y: number, width: number, height: number) {
  const nx = x / width;
  const ny = y / height;
  if (nx < 0.06 || nx > 0.96) return false;
  if (ny < 0.06 || ny > 0.85) return false;
  const leftBound = 0.06 + ny * 0.12;
  const rightBound = 0.96 - ny * 0.10;
  if (nx < leftBound || nx > rightBound) return false;
  const topBound = 0.06 + (nx < 0.3 ? (0.3 - nx) * 0.3 : 0) + (nx > 0.8 ? (nx - 0.8) * 0.2 : 0);
  const bottomBound = 0.85 - (nx > 0.7 ? (nx - 0.7) * 0.6 : 0) - (nx < 0.2 ? (0.2 - nx) * 0.15 : 0);
  return ny > topBound && ny < bottomBound;
}

interface GridCell {
  x: number;
  y: number;
  char: string;
  opacity: number;
  hue: number;
  pulseOffset: number;
  size: number;
}

export default function CyberpunkDataViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const gridDataRef = useRef<GridCell[] | null>(null);

  const initGrid = useCallback((w: number, h: number): GridCell[] => {
    const cellSize = 14;
    const cols = Math.floor(w / cellSize);
    const rows = Math.floor(h / cellSize);
    const grid: GridCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;
        if (isInsideMap(x, y, w, h)) {
          grid.push({
            x, y,
            char: Math.random() > 0.35 ? '7' : '0',
            opacity: Math.random() * 0.6 + 0.4,
            hue: Math.random() > 0.6 ? 320 : (Math.random() > 0.5 ? 280 : 200),
            pulseOffset: Math.random() * Math.PI * 2,
            size: Math.random() > 0.9 ? 11 : 9,
          });
        }
      }
    }
    return grid;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = parent.offsetWidth;
    const H = parent.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    gridDataRef.current = initGrid(W, H);
    const grid = gridDataRef.current;

    function drawFrame(t: number) {
      timeRef.current = t * 0.001;
      const time = timeRef.current;
      ctx!.clearRect(0, 0, W, H);

      const bgGrad = ctx!.createRadialGradient(W * 0.5, H * 0.4, 50, W * 0.5, H * 0.5, W * 0.8);
      bgGrad.addColorStop(0, '#1a0a2e');
      bgGrad.addColorStop(0.5, '#0d0618');
      bgGrad.addColorStop(1, '#050208');
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, W, H);

      const nebulaGrad = ctx!.createRadialGradient(W * 0.4, H * 0.6, 10, W * 0.4, H * 0.6, 300);
      nebulaGrad.addColorStop(0, 'rgba(180, 40, 120, 0.06)');
      nebulaGrad.addColorStop(1, 'rgba(180, 40, 120, 0)');
      ctx!.fillStyle = nebulaGrad;
      ctx!.fillRect(0, 0, W, H);

      for (const cell of grid) {
        const pulse = Math.sin(time * 1.5 + cell.pulseOffset) * 0.15;
        const wave = Math.sin(time * 0.8 + cell.x * 0.01 + cell.y * 0.008) * 0.1;
        const alpha = Math.min(1, Math.max(0.1, cell.opacity + pulse + wave));

        let color;
        if (cell.hue === 320) {
          color = `rgba(255, 80, 200, ${alpha})`;
        } else if (cell.hue === 280) {
          color = `rgba(180, 120, 255, ${alpha * 0.8})`;
        } else {
          color = `rgba(120, 180, 255, ${alpha * 0.7})`;
        }

        ctx!.fillStyle = color;
        ctx!.font = `${cell.size}px "Courier New", monospace`;
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(cell.char, cell.x, cell.y);

        if (alpha > 0.7 && cell.hue === 320) {
          ctx!.shadowColor = 'rgba(255, 80, 200, 0.4)';
          ctx!.shadowBlur = 8;
          ctx!.fillText(cell.char, cell.x, cell.y);
          ctx!.shadowBlur = 0;
        }
      }

      for (let sy = 0; sy < H; sy += 3) {
        ctx!.fillStyle = `rgba(0, 0, 0, ${0.06 + Math.sin(time * 2 + sy * 0.1) * 0.02})`;
        ctx!.fillRect(0, sy, W, 1);
      }

      const floatingNums = [
        { text: '8.21', x: W * 0.65, y: H * 0.22 },
        { text: '0.37', x: W * 0.30, y: H * 0.50 },
        { text: '8.21', x: W * 0.55, y: H * 0.45 },
      ];
      for (const fn of floatingNums) {
        const fAlpha = 0.5 + Math.sin(time * 1.2 + fn.x) * 0.3;
        ctx!.fillStyle = `rgba(255, 140, 100, ${fAlpha})`;
        ctx!.font = '10px "Courier New", monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(fn.text, fn.x, fn.y + Math.sin(time + fn.x) * 3);
      }

      animRef.current = requestAnimationFrame(drawFrame);
    }

    animRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initGrid]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
