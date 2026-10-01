import { useEffect, useRef } from "react";

// Cores da identidade Bial
const BIAL_COLORS = ["#163986", "#00B9D6", "#FFC600", "#FF9E83", "#2F8351", "#8B9CC3"];

/**
 * @component Confetti
 * @description Animação de confetes em canvas (ecrã inteiro, sem bloquear cliques).
 * Corre uma vez enquanto `active` for true e termina sozinha ao fim de `duration` ms.
 * @param {boolean} active - Inicia a animação quando passa a true.
 * @param {number} duration - Duração da emissão de confetes, em ms.
 */
export default function Confetti({ active, duration = 3500 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const pieces = [];
    const spawn = (count) => {
      for (let i = 0; i < count; i++) {
        pieces.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * canvas.height * 0.3,
          w: 6 + Math.random() * 6,
          h: 10 + Math.random() * 8,
          vx: -2 + Math.random() * 4,
          vy: 2 + Math.random() * 3,
          rot: Math.random() * Math.PI,
          vr: -0.2 + Math.random() * 0.4,
          color: BIAL_COLORS[Math.floor(Math.random() * BIAL_COLORS.length)],
        });
      }
    };
    spawn(160);
    const start = performance.now();

    const tick = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (now - start < duration) spawn(3);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rot += p.vr;
        if (p.y > canvas.height + 30) {
          pieces.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (pieces.length > 0) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, duration]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      // Por cima da modal (z-index 1000 do antd); não bloqueia cliques (pointer-events-none)
      style={{ zIndex: 2000 }}
    />
  );
}
