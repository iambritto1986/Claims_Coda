import React, { useEffect, useRef } from 'react';

/**
 * Fair & Square Signature Motion: "Appeal Path"
 * Thin matte-gold document threads flow from scattered denial fragments at the edges
 * into one calm ordered path; slow 10-12 second loop.
 * Honors prefers-reduced-motion with an elegant static ambient fallback.
 */
export function AppealPathMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Fragment particles (scattered at edges)
    const fragmentCount = 28;
    interface Fragment {
      x: number;
      y: number;
      originX: number;
      originY: number;
      size: number;
      speed: number;
      seed: number;
      alpha: number;
      flowProgress: number; // 0 to 1
    }

    const fragments: Fragment[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      // Position along outer perimeter
      const isLeft = Math.random() < 0.5;
      const originX = isLeft ? Math.random() * width * 0.25 : width * (0.75 + Math.random() * 0.25);
      const originY = Math.random() * height;

      fragments.push({
        x: originX,
        y: originY,
        originX,
        originY,
        size: 2.5 + Math.random() * 3.5,
        speed: 0.0003 + Math.random() * 0.0004,
        seed: Math.random() * 100,
        alpha: 0.2 + Math.random() * 0.5,
        flowProgress: Math.random(),
      });
    }

    // Bezier control paths leading from edges to central ordered channel
    const drawThreads = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Soft ambient background grid lines
      ctx.strokeStyle = 'rgba(42, 39, 30, 0.4)';
      ctx.lineWidth = 0.5;

      const step = 60;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Calm central ordered path target
      const targetX = width * 0.5;
      const targetY = height * 0.5;

      // Draw flowing gold threads
      const threadCount = 7;
      for (let i = 0; i < threadCount; i++) {
        const tOffset = (time * 0.00008 + i / threadCount) % 1;
        const startLeft = i % 2 === 0;

        const startX = startLeft ? 20 : width - 20;
        const startY = (height / threadCount) * i + Math.sin(time * 0.001 + i) * 30;

        // Waypoints converging towards the bottom-center flow
        const cp1x = startLeft ? width * 0.25 : width * 0.75;
        const cp1y = startY + Math.cos(time * 0.0008 + i) * 50;

        const cp2x = targetX + (startLeft ? -60 : 60);
        const cp2y = targetY + 80 + i * 20;

        const endX = targetX;
        const endY = height + 40;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

        // Gold gradient along thread
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, 'rgba(185, 152, 69, 0.05)');
        grad.addColorStop(0.5, 'rgba(185, 152, 69, 0.35)');
        grad.addColorStop(1, 'rgba(185, 152, 69, 0.15)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Little pulses traveling along threads
        if (!prefersReducedMotion) {
          const pulseT = (tOffset + i * 0.15) % 1;
          // Calculate point on cubic bezier
          const u = 1 - pulseT;
          const px = u * u * u * startX + 3 * u * u * pulseT * cp1x + 3 * u * pulseT * pulseT * cp2x + pulseT * pulseT * pulseT * endX;
          const py = u * u * u * startY + 3 * u * u * pulseT * cp1y + 3 * u * pulseT * pulseT * cp2y + pulseT * pulseT * pulseT * endY;

          ctx.fillStyle = 'rgba(243, 239, 230, 0.8)';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(185, 152, 69, 0.4)';
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Scattered denial document fragments at the borders
      fragments.forEach((frag, idx) => {
        if (!prefersReducedMotion) {
          frag.flowProgress = (frag.flowProgress + frag.speed * 8) % 1;
        }

        // Animate from outer boundary toward center confluence
        const currentX = frag.originX + Math.sin(frag.seed + time * 0.0006) * 20;
        const currentY = frag.originY + Math.cos(frag.seed + time * 0.0006) * 20;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate((frag.seed + time * 0.0002) % (Math.PI * 2));

        // Draw small subtle rectangular fragment (denial document snippet)
        ctx.strokeStyle = `rgba(185, 152, 69, ${frag.alpha * 0.7})`;
        ctx.fillStyle = `rgba(20, 19, 16, ${frag.alpha * 0.85})`;
        ctx.lineWidth = 1;
        ctx.fillRect(-frag.size * 1.5, -frag.size, frag.size * 3, frag.size * 2);
        ctx.strokeRect(-frag.size * 1.5, -frag.size, frag.size * 3, frag.size * 2);

        // Tiny lines on fragment resembling text
        ctx.strokeStyle = `rgba(185, 152, 69, ${frag.alpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(-frag.size, -frag.size * 0.3);
        ctx.lineTo(frag.size * 0.8, -frag.size * 0.3);
        ctx.moveTo(-frag.size, frag.size * 0.3);
        ctx.lineTo(frag.size * 0.4, frag.size * 0.3);
        ctx.stroke();

        ctx.restore();
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(drawThreads);
      }
    };

    if (prefersReducedMotion) {
      drawThreads(1000);
    } else {
      animationFrameId = requestAnimationFrame(drawThreads);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
