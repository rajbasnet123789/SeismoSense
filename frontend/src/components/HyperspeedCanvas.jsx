'use client';
import { useEffect, useRef, useCallback } from 'react';

const NUM_BEAMS = 130;

function makeBeam(vpx, vpy, w, h) {
  const angle = Math.random() * Math.PI * 2;
  const cx = Math.cos(angle);

  let hue, sat, lit;
  if (cx < -0.15) {
    // Left-going → magenta / hot pink
    hue = 285 + Math.random() * 55;   // 285-340
    sat = 100;
    lit = 58 + Math.random() * 18;
  } else if (cx > 0.15) {
    // Right-going → cyan / teal
    hue = 168 + Math.random() * 38;   // 168-206
    sat = 100;
    lit = 52 + Math.random() * 18;
  } else {
    // Straight ahead → pale blue / white
    hue = 205 + Math.random() * 30;
    sat = 50 + Math.random() * 50;
    lit = 65 + Math.random() * 20;
  }

  return {
    angle,
    r:          Math.random() * 60,          // current radius from VP
    speed:      2.5 + Math.random() * 6.5,   // px per frame
    trailLen:   25 + Math.random() * 130,    // length of visible trail
    lineWidth:  0.25 + Math.random() * 1.9,
    hue, sat, lit,
    vpx, vpy, w, h,
  };
}

export default function HyperspeedCanvas({ accelerate = false }) {
  const canvasRef  = useRef(null);
  const beamsRef   = useRef([]);
  const animRef    = useRef(null);
  const accelRef   = useRef(accelerate);

  useEffect(() => { accelRef.current = accelerate; }, [accelerate]);

  const getVP = useCallback((w, h) => ({ vpx: w * 0.5, vpy: h * 0.43 }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const init = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const { vpx, vpy } = getVP(canvas.width, canvas.height);
      beamsRef.current = Array.from({ length: NUM_BEAMS }, () =>
        makeBeam(vpx, vpy, canvas.width, canvas.height)
      );
    };

    init();
    window.addEventListener('resize', init);

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      const { vpx, vpy } = getVP(w, h);
      const mul = accelRef.current ? 4.5 : 1;

      // Clear with very dark bg
      ctx.fillStyle = '#07070F';
      ctx.fillRect(0, 0, w, h);

      // Subtle radial brightening near vanishing point
      const rg = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, 260);
      rg.addColorStop(0, 'rgba(40,40,80,0.18)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);

      beamsRef.current.forEach((b, i) => {
        b.r += b.speed * mul;

        const tipX = b.vpx + Math.cos(b.angle) * b.r;
        const tipY = b.vpy + Math.sin(b.angle) * b.r;

        // Reset beam when it goes off-screen
        if (tipX < -120 || tipX > w + 120 || tipY < -120 || tipY > h + 120) {
          beamsRef.current[i] = makeBeam(vpx, vpy, w, h);
          return;
        }

        const tailR = Math.max(0, b.r - b.trailLen);
        const tailX = b.vpx + Math.cos(b.angle) * tailR;
        const tailY = b.vpy + Math.sin(b.angle) * tailR;

        const alpha = Math.min(0.9, b.r / 55);
        const color = `hsl(${b.hue},${b.sat}%,${b.lit}%)`;

        // Gradient: transparent at tail → full color at tip
        const grad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
        grad.addColorStop(0, `hsla(${b.hue},${b.sat}%,${b.lit}%,0)`);
        grad.addColorStop(1, `hsla(${b.hue},${b.sat}%,${b.lit}%,${alpha})`);

        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth   = b.lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 7;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', init);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [getVP]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        display: 'block',
      }}
    />
  );
}
