import React, { useEffect, useState, useRef } from 'react';
import heroBgImg from '../../assets/black_hole_universe.png';

export const ScrollHeroBackground: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setScrollProgress(0.1);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      // Normalized scroll progress capped between 0 and 1
      targetProgress.current = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Smooth dampening loop using requestAnimationFrame
    const updateSmoothScroll = () => {
      // Linear interpolation (lerp) with factor 0.1 for silky physics
      const diff = targetProgress.current - currentProgress.current;
      currentProgress.current += diff * 0.08;

      if (Math.abs(diff) > 0.0005) {
        setScrollProgress(currentProgress.current);
      }

      animFrameId.current = requestAnimationFrame(updateSmoothScroll);
    };

    animFrameId.current = requestAnimationFrame(updateSmoothScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  // Compute scroll-linked transformation parameters
  // 0% scroll   -> scale 1.00, rotate 0deg, translateY 0px
  // 25% scroll  -> scale 1.05, rotate 1.5deg, translateY -12px
  // 50% scroll  -> scale 1.11, rotate 3.0deg, translateY -25px
  // 75% scroll  -> scale 1.17, rotate 4.5deg, translateY -38px
  // 100% scroll -> scale 1.22, rotate 6.0deg, translateY -50px
  const scale = 1.0 + scrollProgress * 0.22;
  const rotation = scrollProgress * 6.0;
  const translateY = scrollProgress * -50;
  const opacity = Math.max(0.35, 0.65 - scrollProgress * 0.25);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Scroll-Driven Accretion Disk Graphic */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform will-change-transform"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) scale(${scale}) rotate(${rotation}deg)`,
          opacity: opacity,
        }}
      >
        <img
          src={heroBgImg}
          alt=""
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center max-w-none filter contrast-125 brightness-95"
        />
      </div>

      {/* Radial Center Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(5, 8, 17, 0.15) 0%, rgba(5, 8, 17, 0.65) 55%, #050811 90%)',
        }}
      />

      {/* Top & Bottom Cinematic Edge Gradients */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#050811] via-[#050811]/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050811] via-[#050811]/80 to-transparent" />

      {/* Subtle Cyan/Electric Blue Atmospheric Ambient Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(59, 130, 246, 0.2) 60%, transparent 80%)',
          transform: `scale(${1 + scrollProgress * 0.15})`,
        }}
      />
    </div>
  );
};
