import React, { useEffect, useRef } from 'react';
import { CLUSTER_VISUAL_THEMES } from '../../services/realData';

interface UniverseCanvasProps {
  activeClusterId?: number | null;
  interactive?: boolean;
}

interface OrbitingViewer {
  radiusX: number;
  radiusY: number;
  angle: number;
  speed: number;
  clusterAffinity: number; // 0..3
  size: number;
  alpha: number;
  color: string;
}

export const UniverseCanvas: React.FC<UniverseCanvasProps> = ({
  activeClusterId = null,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates for gravitational cursor influence
    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Orbital center (aligned with accretion disk center)
    const getCenter = () => ({
      x: width * 0.5,
      y: height * 0.45,
    });

    // Color palette: restrained electric blue, warm silver, subtle cyan
    const PALETTE = [
      '#38BDF8', // Electric blue
      '#E2E8F0', // Accretion silver
      '#06B6D4', // Subtle cyan
      '#94A3B8', // Muted slate silver
    ];

    // Generate 120 orbiting viewer points across 4 gravitational orbital bands
    const viewerCount = 110;
    const viewers: OrbitingViewer[] = [];

    for (let i = 0; i < viewerCount; i++) {
      const clusterAffinity = i % 4;
      const theme = CLUSTER_VISUAL_THEMES[clusterAffinity];
      const baseRadius = theme.orbitRadius * (width < 768 ? 0.8 : 1.35);
      const radiusVariation = (Math.random() - 0.5) * 35;
      const rX = Math.max(70, baseRadius + radiusVariation);
      const rY = rX * 0.58; // Inclined perspective projection

      // Keplerian velocity approximation: inner orbits revolve faster
      const speed = (0.003 + 0.006 * Math.pow(120 / rX, 0.75)) * (Math.random() * 0.3 + 0.85);

      viewers.push({
        radiusX: rX,
        radiusY: rY,
        angle: Math.random() * Math.PI * 2,
        speed: speed,
        clusterAffinity,
        size: Math.random() * 1.4 + 0.8,
        alpha: Math.random() * 0.5 + 0.25,
        color: PALETTE[clusterAffinity],
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const center = getCenter();

      // 1. Draw subtle concentric orbital guide tracks
      CLUSTER_VISUAL_THEMES.forEach((theme) => {
        const baseRadius = theme.orbitRadius * (width < 768 ? 0.8 : 1.35);
        const isActive = activeClusterId === theme.id;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          center.x,
          center.y,
          baseRadius,
          baseRadius * 0.58,
          0,
          0,
          Math.PI * 2
        );
        ctx.setLineDash([2, 10]);
        ctx.strokeStyle = isActive
          ? 'rgba(56, 189, 248, 0.45)'
          : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = isActive ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();
      });

      // 2. Draw and advance orbiting viewer data points
      for (let i = 0; i < viewers.length; i++) {
        const v = viewers[i];
        if (!prefersReducedMotion) {
          v.angle += v.speed;
        }

        // Elliptical coordinate calculation
        let px = center.x + Math.cos(v.angle) * v.radiusX;
        let py = center.y + Math.sin(v.angle) * v.radiusY;

        // Gravitational displacement from cursor
        if (interactive && mouseX > 0) {
          const dx = mouseX - px;
          const dy = mouseY - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140 && dist > 1) {
            const pull = (1 - dist / 140) * 8;
            px += (dx / dist) * pull;
            py += (dy / dist) * pull;
          }
        }

        const isAffinityActive = activeClusterId === v.clusterAffinity;
        const currentAlpha = isAffinityActive
          ? Math.min(1, v.alpha + 0.4)
          : activeClusterId !== null
          ? v.alpha * 0.35
          : v.alpha;

        // Faint trajectory tail
        if (!prefersReducedMotion) {
          const prevAngle = v.angle - v.speed * 6;
          const prevX = center.x + Math.cos(prevAngle) * v.radiusX;
          const prevY = center.y + Math.sin(prevAngle) * v.radiusY;

          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = v.color;
          ctx.globalAlpha = currentAlpha * 0.25;
          ctx.lineWidth = v.size * 0.6;
          ctx.stroke();
        }

        // Viewer point
        ctx.beginPath();
        ctx.arc(px, py, isAffinityActive ? v.size * 1.5 : v.size, 0, Math.PI * 2);
        ctx.fillStyle = v.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeClusterId, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-75"
    />
  );
};
