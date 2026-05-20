import { useEffect, useRef } from 'react';

const MATRIX_TERMS = [
  'BNS',
  'BNSS',
  'BSA',
  'Section',
  'Whereas',
  'Hereinafter',
  'Plaintiff',
  'Defendant',
  'Justice',
];

const PARTICLE_COUNT = 28;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default function AuthAnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animationId;
    let columns = [];
    let fontSize = 14;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.max(12, Math.floor(width / 72));
      const columnCount = Math.floor(width / fontSize);
      columns = Array.from({ length: columnCount }, () => ({
        y: randomBetween(-height, 0),
        speed: randomBetween(0.35, 1.1),
        termIndex: Math.floor(Math.random() * MATRIX_TERMS.length),
        charOffset: 0,
      }));
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(2, 4, 8, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `600 ${fontSize}px "DM Sans", sans-serif`;

      columns.forEach((col, i) => {
        const x = i * fontSize + fontSize * 0.35;
        const term = MATRIX_TERMS[col.termIndex];
        const char = term[col.charOffset % term.length];

        const headAlpha = 0.55 + Math.sin(Date.now() * 0.002 + i) * 0.15;
        ctx.fillStyle = `rgba(201, 168, 76, ${headAlpha})`;
        ctx.fillText(char, x, col.y);

        ctx.fillStyle = 'rgba(201, 168, 76, 0.08)';
        for (let t = 1; t < 4; t += 1) {
          const trailY = col.y - t * fontSize;
          if (trailY > 0) {
            const trailTerm = MATRIX_TERMS[(col.termIndex + t) % MATRIX_TERMS.length];
            const trailChar = trailTerm[(col.charOffset + t) % trailTerm.length];
            ctx.fillText(trailChar, x, trailY);
          }
        }

        col.y += fontSize * col.speed;
        if (col.y > height + fontSize * 4) {
          col.y = randomBetween(-fontSize * 8, -fontSize);
          col.termIndex = Math.floor(Math.random() * MATRIX_TERMS.length);
          col.charOffset = 0;
          col.speed = randomBetween(0.35, 1.1);
        } else if (Math.random() < 0.02) {
          col.charOffset += 1;
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animationId);
      ro.disconnect();
    };
  }, []);

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: `${randomBetween(2, 98)}%`,
    delay: `${randomBetween(0, 14)}s`,
    duration: `${randomBetween(12, 22)}s`,
    size: `${randomBetween(2, 4)}px`,
    drift: `${randomBetween(-30, 30)}px`,
  }));

  return (
    <div className="auth-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="auth-matrix-canvas" />
      <div className="auth-vignette" />

      <svg
        className="auth-pillars"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor">
          <rect x="60" y="80" width="48" height="320" rx="4" />
          <rect x="132" y="80" width="48" height="320" rx="4" />
          <path d="M84 80 L156 80 L120 20 Z" />
          <rect x="692" y="80" width="48" height="320" rx="4" />
          <rect x="620" y="80" width="48" height="320" rx="4" />
          <path d="M668 80 L740 80 L704 20 Z" />
          <rect x="340" y="120" width="56" height="280" rx="4" />
          <rect x="404" y="120" width="56" height="280" rx="4" />
          <path d="M368 120 L432 120 L400 60 Z" />
          <rect x="200" y="200" width="400" height="24" rx="2" opacity="0.6" />
          <path
            d="M180 224 Q400 260 620 224 L620 400 L180 400 Z"
            opacity="0.4"
          />
        </g>
      </svg>

      {particles.map((p) => (
        <span
          key={p.id}
          className="auth-particle"
          style={{
            left: p.left,
            bottom: '-8px',
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--drift': p.drift,
          }}
        />
      ))}
    </div>
  );
}
