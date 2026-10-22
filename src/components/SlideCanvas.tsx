import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Trash2, Edit3, Dot } from 'lucide-react';

interface SlideCanvasProps {
  mode: 'off' | 'laser' | 'pen';
  penColor: string;
  onClear?: () => void;
  children: React.ReactNode;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  mode,
  penColor,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode !== 'pen' || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'laser') {
      setLaserPos({ x, y, visible: true });
    }

    if (mode === 'pen' && isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handlePointerLeave = () => {
    setIsDrawing(false);
    setLaserPos(prev => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full h-full select-none ${
        mode === 'laser'
          ? 'cursor-none'
          : mode === 'pen'
          ? 'cursor-crosshair'
          : ''
      }`}
    >
      {/* Content under annotations */}
      {children}

      {/* Drawing canvas layer */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-200 ${
          mode === 'pen' ? 'opacity-100' : 'opacity-80'
        }`}
      />

      {/* Laser pointer glow dot */}
      {mode === 'laser' && laserPos.visible && (
        <div
          className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
        >
          <div className="relative flex items-center justify-center">
            {/* Pulsing outer aura */}
            <div className="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping" />
            {/* Radiant core glow */}
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_#ef4444,0_0_30px_#ef4444] border border-white" />
          </div>
        </div>
      )}
    </div>
  );
};
