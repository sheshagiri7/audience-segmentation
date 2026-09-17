import React, { useEffect, useRef, useState } from 'react';
import framesManifest from '../../data/framesManifest.json';

interface FramesData {
  totalFrames: number;
  frameFiles: string[];
  firstFrame: string;
  lastFrame: string;
}

const manifest = framesManifest as FramesData;

interface ScrollFrameBackgroundProps {
  isIntroActive?: boolean;
}

export const ScrollFrameBackground: React.FC<ScrollFrameBackgroundProps> = ({
  isIntroActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setLoadedCount] = useState<number>(0);
  const [isInitialReady, setIsInitialReady] = useState<boolean>(false);

  // Scroll interpolation tracking
  const targetProgress = useRef<number>(0);
  const currentProgress = useRef<number>(0);
  const animFrameId = useRef<number | null>(null);

  // Cached Image elements Map<frameIndex, HTMLImageElement>
  const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());
  const lastRenderedIndex = useRef<number>(0);

  const totalFrames = manifest.totalFrames;
  const frameFiles = manifest.frameFiles;

  // Render a specific frame index onto the canvas with cover scaling
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find requested frame or fallback to the closest already-loaded frame
    let imgToDraw = imageCache.current.get(index);
    if (!imgToDraw || !imgToDraw.complete) {
      // Look for the closest loaded frame to avoid any blank flash or flicker
      let bestIndex = lastRenderedIndex.current;
      let minDiff = Infinity;
      imageCache.current.forEach((cachedImg, idx) => {
        if (cachedImg.complete) {
          const diff = Math.abs(idx - index);
          if (diff < minDiff) {
            minDiff = diff;
            bestIndex = idx;
          }
        }
      });
      imgToDraw = imageCache.current.get(bestIndex);
    }

    if (!imgToDraw || !imgToDraw.complete) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = imgToDraw.naturalWidth || 1280;
    const ih = imgToDraw.naturalHeight || 720;

    // Cover scaling without distortion
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(imgToDraw, dx, dy, dw, dh);
    lastRenderedIndex.current = index;
  };

  // Resize canvas resolution to viewport
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      drawFrame(lastRenderedIndex.current);
    }
  };

  // Preloading engine
  useEffect(() => {
    let isCancelled = false;

    // 1. Eagerly preload frame 0 for immediate render
    const firstImg = new Image();
    firstImg.src = frameFiles[0];
    firstImg.onload = () => {
      if (isCancelled) return;
      imageCache.current.set(0, firstImg);
      setIsInitialReady(true);
      setLoadedCount((prev) => prev + 1);
      updateCanvasSize();
      drawFrame(0);
    };

    // 2. Progressive background preloader with batch concurrency & mobile fallback
    const preloadAllFrames = async () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const concurrency = isMobile ? 2 : 4;
      const frameStep = isMobile ? 2 : 1;
      const indicesToLoad: number[] = [];
      for (let i = 1; i < totalFrames; i += frameStep) {
        indicesToLoad.push(i);
      }
      if (!indicesToLoad.includes(totalFrames - 1)) {
        indicesToLoad.push(totalFrames - 1);
      }

      const loadSingleFrame = (index: number): Promise<void> => {
        return new Promise((resolve) => {
          if (isCancelled || imageCache.current.has(index)) {
            resolve();
            return;
          }
          const img = new Image();
          img.src = frameFiles[index];
          img.onload = () => {
            if (!isCancelled) {
              imageCache.current.set(index, img);
              setLoadedCount((c) => c + 1);
            }
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
        });
      };

      // Worker pool for parallel loading without network saturation
      const pool: Promise<void>[] = [];
      let cursor = 0;

      const nextWorker = async (): Promise<void> => {
        while (cursor < indicesToLoad.length && !isCancelled) {
          const nextIndex = indicesToLoad[cursor++];
          await loadSingleFrame(nextIndex);
        }
      };

      for (let c = 0; c < concurrency; c++) {
        pool.push(nextWorker());
      }

      await Promise.all(pool);
    };

    // Run progressive preload shortly after initial paint
    const timer = setTimeout(() => {
      preloadAllFrames();
    }, 50);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [totalFrames, frameFiles]);

  // Window resize listener
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize, { passive: true });
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Scroll listener and Lerp animation loop
  useEffect(() => {
    // If intro sequence is active, hold frame 0 statically
    if (isIntroActive) {
      targetProgress.current = 0;
      currentProgress.current = 0;
      drawFrame(0);
      return;
    }

    // Respect prefers-reduced-motion: maintain static first frame
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      drawFrame(0);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      // Normalized scroll progress [0.0, 1.0]
      targetProgress.current = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Silky lerp loop (damping factor 0.12)
    const updateRenderLoop = () => {
      const diff = targetProgress.current - currentProgress.current;
      currentProgress.current += diff * 0.12;

      // Map progress to frame index [0, totalFrames - 1]
      const targetIndex = Math.min(
        Math.max(
          Math.round(currentProgress.current * (totalFrames - 1)),
          0
        ),
        totalFrames - 1
      );

      if (targetIndex !== lastRenderedIndex.current || Math.abs(diff) > 0.0001) {
        drawFrame(targetIndex);
      }

      animFrameId.current = requestAnimationFrame(updateRenderLoop);
    };

    animFrameId.current = requestAnimationFrame(updateRenderLoop);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [totalFrames, isIntroActive]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Black hole sequence canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          isInitialReady ? 'opacity-85' : 'opacity-0'
        }`}
        style={{
          filter: 'contrast(1.15) brightness(0.9)',
        }}
      />

      {/* Cinematic Deep Horizon Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(3, 6, 12, 0.25) 0%, rgba(3, 6, 12, 0.7) 65%, #03060C 95%)',
        }}
      />

      {/* Edge Gradient Transitions for Header and Footer Content */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#03060C] via-[#03060C]/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#03060C] via-[#03060C]/85 to-transparent" />

      {/* Atmospheric Accretion Cyan Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px] pointer-events-none opacity-15"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 80%)',
        }}
      />
    </div>
  );
};
