import React, { useState, useEffect, useCallback, useRef } from 'react';

interface CinematicIntroProps {
  onComplete: () => void;
}

const STORAGE_KEY = 'event_horizon_intro_seen';

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  // Intro progression phases:
  // 'black': pure near-black canvas (0 - 350ms)
  // 'title-in': subtle fade in (350 - 1050ms)
  // 'title-hold': serene pause (1050 - 1750ms)
  // 'title-out': smooth title fade out (1750 - 2250ms)
  // 'fade-site': black curtain crossfades into homepage (2250 - 2800ms)
  const [phase, setPhase] = useState<'black' | 'title-in' | 'title-hold' | 'title-out' | 'fade-site'>('black');
  const hasCompleted = useRef(false);

  const completeIntro = useCallback(() => {
    if (hasCompleted.current) return;
    hasCompleted.current = true;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // Ignore storage exceptions (e.g. strict private browsing mode)
      }
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // 1. Session check: if already viewed in this browser session, skip immediately
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
          onComplete();
          return;
        }
      } catch {
        // Continue if sessionStorage not accessible
      }

      // 2. Accessibility: prefers-reduced-motion skips animated typography
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        const quickFadeTimer = setTimeout(() => {
          setPhase('fade-site');
          setTimeout(completeIntro, 300);
        }, 200);
        return () => clearTimeout(quickFadeTimer);
      }
    }

    // Lock page scrolling during intro to prevent accidental scroll shifts
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Phase 2: Fade in title
    const t1 = setTimeout(() => {
      setPhase('title-in');
    }, 350);

    // Phase 3: Hold title
    const t2 = setTimeout(() => {
      setPhase('title-hold');
    }, 1050);

    // Phase 4: Fade title out smoothly
    const t3 = setTimeout(() => {
      setPhase('title-out');
    }, 1750);

    // Phase 5: Crossfade black curtain into Event Horizon hero
    const t4 = setTimeout(() => {
      setPhase('fade-site');
    }, 2250);

    // Phase 6: Final unmount callback (~2.8s total duration)
    const t5 = setTimeout(() => {
      completeIntro();
    }, 2800);

    // Loading Safety Fallback: Absolute failsafe to ensure user is NEVER trapped on black
    const safetyTimer = setTimeout(() => {
      completeIntro();
    }, 3200);

    // Escape key listener for quick skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        completeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(safetyTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [completeIntro, onComplete]);

  return (
    <div
      role="status"
      aria-label="Loading Audience Segmentation"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#020408] select-none transition-opacity duration-600 ease-out ${
        phase === 'fade-site' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Centered Minimal Project Identity */}
      <div
        className={`text-center px-6 transition-all duration-700 ease-out transform ${
          phase === 'title-in' || phase === 'title-hold'
            ? 'opacity-100 translate-y-0 filter blur-0 scale-100'
            : phase === 'title-out'
            ? 'opacity-0 -translate-y-1 filter blur-[1px] scale-[1.01]'
            : 'opacity-0 translate-y-2 filter blur-[2px] scale-[0.99]'
        }`}
      >
        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[0.24em] sm:tracking-[0.32em] text-white uppercase select-none font-sans">
          AUDIENCE <span className="font-semibold text-slate-100">SEGMENTATION</span>
        </h1>

        {/* Minimal Supporting Subtitle */}
        <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs md:text-sm font-mono tracking-[0.28em] sm:tracking-[0.36em] text-sky-400 uppercase opacity-75">
          VIEWER INTELLIGENCE SYSTEM
        </p>
      </div>

      {/* Discrete Skip Trigger */}
      <button
        type="button"
        onClick={completeIntro}
        aria-label="Skip intro"
        className="absolute bottom-6 right-6 z-20 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest text-slate-600 hover:text-slate-400 transition-colors uppercase"
      >
        [ SKIP → ]
      </button>
    </div>
  );
};
