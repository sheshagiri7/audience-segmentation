import React, { useState, useEffect, useCallback } from 'react';
import { REAL_MODEL_METADATA, CLUSTER_VISUAL_THEMES, SegmentProfile, TrainedModelMetadata } from '../services/realData';
import { PageId } from '../components/layout/Navbar';
import { fetchLiveSegments } from '../services/api';

interface SegmentsPageProps {
  onNavigate: (page: PageId) => void;
}

export const SegmentsPage: React.FC<SegmentsPageProps> = ({ onNavigate }) => {
  const [metadata, setMetadata] = useState<TrainedModelMetadata>(REAL_MODEL_METADATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);

  const loadSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const live = await fetchLiveSegments();
    if (live) {
      if (Array.isArray(live)) {
        setMetadata(prev => ({
          ...prev,
          segments: live,
        }));
      } else if (live.segments) {
        setMetadata(prev => ({
          ...prev,
          ...live,
        }));
      }
      setIsLive(true);
    } else {
      setError('Live endpoint unavailable: showing cached model snapshot.');
      setIsLive(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoomedSystemId, setZoomedSystemId] = useState<number | null>(null);

  const hoveredSegment = hoveredId !== null 
    ? metadata.segments.find(s => s.segment_id === hoveredId) 
    : null;

  const zoomedSegment = zoomedSystemId !== null
    ? metadata.segments.find(s => s.segment_id === zoomedSystemId)
    : null;

  const zoomedTheme = zoomedSystemId !== null
    ? CLUSTER_VISUAL_THEMES.find(t => t.id === zoomedSystemId) || CLUSTER_VISUAL_THEMES[0]
    : null;

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-12 space-y-12 animate-in fade-in duration-500">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="h-[1px] w-6 bg-sky-400"></span>
            <span className="label-telemetry text-sky-400">
              AUDIENCE SEGMENTS // 4 GRAVITATIONAL SYSTEMS
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {isLoading ? 'SYNCING /SEGMENTS...' : isLive ? 'LIVE /SEGMENTS' : 'OFFLINE SNAPSHOT'}
            </span>
          </div>
          <h1 className="title-editorial text-4xl sm:text-6xl text-slate-100 font-black">
            {zoomedSegment ? `SYSTEM 0${zoomedSegment.segment_id}` : 'ORBITAL AUDIENCE SYSTEMS'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-light max-w-2xl">
            {zoomedSegment 
              ? `Deep gravitational telemetry and catalog trajectory vectors for ${zoomedSegment.segment_name}.`
              : 'Interactive 4-body gravitational architecture. Click any orbital system to zoom in and inspect its behavioral characteristics.'
            }
          </p>
          {error && (
            <div className="mt-3 inline-flex items-center space-x-3 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <span>{error}</span>
              <button
                onClick={loadSegments}
                className="underline hover:text-amber-200 cursor-pointer font-bold"
              >
                [Retry Sync]
              </button>
            </div>
          )}
        </div>

        {zoomedSegment ? (
          <button
            onClick={() => setZoomedSystemId(null)}
            className="px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-sky-400 hover:text-white font-mono text-xs uppercase tracking-widest transition flex items-center space-x-2"
          >
            <span>← RETURN TO AUDIENCE UNIVERSE</span>
          </button>
        ) : (
          <div className="font-mono text-xs text-slate-400 flex items-center space-x-4">
            <button
              onClick={loadSegments}
              className="hover:text-sky-400 transition cursor-pointer text-slate-500"
              title="Refresh /segments from API"
            >
              ↻ REFRESH
            </button>
            <span>TOTAL UNIVERSE SAMPLES: <strong className="text-slate-100">{metadata.total_training_samples.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* =========================================================================
          VIEW A: FULL AUDIENCE UNIVERSE (ORBITAL MAP)
          ========================================================================= */}
      {!zoomedSegment && (
        <div className="space-y-8">
          <div className="relative rounded-3xl bg-[#060A14]/90 border border-white/[0.08] p-6 sm:p-12 overflow-hidden min-h-[580px] flex items-center justify-center select-none shadow-2xl">
            {/* Telemetry grid */}
            <div className="absolute inset-0 telemetry-grid opacity-30 pointer-events-none" />

            {/* Coordinate Crosshairs */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/[0.04] pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/[0.04] pointer-events-none" />

            {/* Interactive Concentric SVG Orbits */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-320 -320 640 640">
              {CLUSTER_VISUAL_THEMES.map((theme) => {
                const isHovered = hoveredId === theme.id;
                const r = theme.orbitRadius * 0.75;
                return (
                  <ellipse
                    key={theme.id}
                    cx="0"
                    cy="0"
                    rx={isHovered ? r * 1.1 : r}
                    ry={isHovered ? r * 0.65 : r * 0.58}
                    fill="none"
                    stroke={isHovered ? theme.color : 'rgba(255, 255, 255, 0.08)'}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={isHovered ? '4 6' : '2 8'}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Central Singularity */}
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative w-28 h-28 rounded-full bg-black border border-sky-400/40 shadow-ring-accretion flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black border border-sky-400/80 shadow-[inset_0_0_12px_rgba(56,189,248,0.6)] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-200"></span>
                </div>
              </div>
              <span className="mt-2 text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                CENTROID CORE
              </span>
            </div>

            {/* 4 Gravitational System Nodes */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {metadata.segments.map((seg) => {
                const theme = CLUSTER_VISUAL_THEMES.find((t) => t.id === seg.segment_id) || CLUSTER_VISUAL_THEMES[0];
                const isHovered = hoveredId === seg.segment_id;
                const angleRad = (theme.angleDeg * Math.PI) / 180;
                const r = theme.orbitRadius * 0.75;
                const x = Math.cos(angleRad) * (isHovered ? r * 1.1 : r);
                const y = Math.sin(angleRad) * (isHovered ? r * 0.65 : r * 0.58);

                return (
                  <div
                    key={seg.segment_id}
                    className="absolute pointer-events-auto transition-all duration-300"
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                      opacity: hoveredId === null || isHovered ? 1 : 0.4,
                    }}
                    onMouseEnter={() => setHoveredId(seg.segment_id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setZoomedSystemId(seg.segment_id)}
                  >
                    <button className="relative p-3 rounded-full group cursor-pointer">
                      <div
                        className="absolute inset-0 rounded-full blur-md transition-opacity duration-300"
                        style={{
                          backgroundColor: theme.color,
                          opacity: isHovered ? 0.7 : 0.25,
                        }}
                      />
                      <div
                        className="relative w-5 h-5 rounded-full border border-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-125"
                        style={{ backgroundColor: theme.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>
                    </button>

                    <div
                      className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded-full bg-[#060A14]/90 border text-[10px] font-mono whitespace-nowrap transition-all duration-200 ${
                        isHovered ? 'border-sky-400 text-slate-100 shadow-glow-electric' : 'border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="font-bold text-sky-400 mr-1.5">SYSTEM 0{seg.segment_id}</span>
                      <span>{seg.profile.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hovered System Preview Card */}
            {hoveredSegment && (
              <div className="absolute bottom-6 right-6 z-20 max-w-sm w-full p-5 rounded-2xl bg-[#060A14]/95 border border-sky-400/40 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono text-sky-400 pb-2 border-b border-white/10">
                  <span className="font-bold uppercase">SYSTEM 0{hoveredSegment.segment_id} // PREVIEW</span>
                  <span>{hoveredSegment.profile.percentage}% SHARE</span>
                </div>
                <h4 className="mt-2 text-base font-bold text-slate-100">{hoveredSegment.segment_name}</h4>
                <p className="mt-1 text-xs text-slate-400 font-light leading-relaxed">{hoveredSegment.description}</p>
                <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-xs font-mono text-slate-300">
                  <span>Avg Watch: <strong>{hoveredSegment.profile.avg_watch_time_hours}h</strong></span>
                  <span>Session: <strong>{hoveredSegment.profile.avg_session_mins}m</strong></span>
                </div>
                <div className="mt-3 text-[10px] font-mono text-sky-400 text-center">
                  [ CLICK SYSTEM TO ZOOM IN ]
                </div>
              </div>
            )}
          </div>

          {/* 4 Systems Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metadata.segments.map((seg) => {
              const theme = CLUSTER_VISUAL_THEMES.find((t) => t.id === seg.segment_id) || CLUSTER_VISUAL_THEMES[0];
              const isHovered = hoveredId === seg.segment_id;

              return (
                <div
                  key={seg.segment_id}
                  onClick={() => setZoomedSystemId(seg.segment_id)}
                  onMouseEnter={() => setHoveredId(seg.segment_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-6 rounded-3xl bg-[#060A14]/80 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                    isHovered ? 'border-sky-400/50 shadow-glow-electric' : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                        ORBIT 0{seg.segment_id}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-100">
                        {seg.profile.percentage}%
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 font-sans">{seg.segment_name}</h3>
                    <p className="text-xs text-slate-400 font-light line-clamp-2">{seg.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{seg.profile.count.toLocaleString()} Viewers</span>
                    <span className="text-sky-400">Zoom In →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW B: ZOOMED-IN GRAVITATIONAL SYSTEM VIEW
          ========================================================================= */}
      {zoomedSegment && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Main System Profile Card */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#060A14]/90 border border-sky-400/40 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 telemetry-grid opacity-25 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full bg-sky-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider">
                    SYSTEM 0{zoomedSegment.segment_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ORBIT RADIUS: {zoomedTheme?.orbitRadius} PX
                  </span>
                </div>
                <h2 className="title-editorial text-3xl sm:text-5xl text-slate-100 font-black mt-3">
                  {zoomedSegment.segment_name}
                </h2>
                <p className="text-sm sm:text-base text-slate-400 font-light max-w-2xl mt-2 leading-relaxed">
                  {zoomedSegment.description}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end font-mono text-xs text-slate-400 space-y-1">
                <span>VIEWER POPULATION: <strong className="text-slate-100">{zoomedSegment.profile.count.toLocaleString()}</strong></span>
                <span>AUDIENCE SHARE: <strong className="text-sky-300">{zoomedSegment.profile.percentage}%</strong></span>
                <span>SYSTEM STATUS: <strong className="text-sky-400">STABLE EQUILIBRIUM</strong></span>
              </div>
            </div>

            <div className="measuring-line-x" />

            {/* Behavioral Characteristics (Oversized Editorial Numbers) */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              <div className="space-y-1 border-l border-white/15 pl-4 font-mono">
                <span className="label-telemetry">AVG WATCH TIME</span>
                <div className="num-oversized text-3xl sm:text-4xl text-slate-100">
                  {zoomedSegment.profile.avg_watch_time_hours}
                  <span className="text-xs text-slate-400 font-sans ml-1">hrs</span>
                </div>
              </div>

              <div className="space-y-1 border-l border-white/15 pl-4 font-mono">
                <span className="label-telemetry">AVG SESSION</span>
                <div className="num-oversized text-3xl sm:text-4xl text-slate-100">
                  {zoomedSegment.profile.avg_session_mins}
                  <span className="text-xs text-slate-400 font-sans ml-1">min</span>
                </div>
              </div>

              <div className="space-y-1 border-l border-white/15 pl-4 font-mono">
                <span className="label-telemetry">GENRE BREADTH</span>
                <div className="num-oversized text-3xl sm:text-4xl text-sky-400">
                  {zoomedSegment.profile.avg_genre_count}
                  <span className="text-xs text-slate-400 font-sans ml-1">genres</span>
                </div>
              </div>

              <div className="space-y-1 border-l border-white/15 pl-4 font-mono">
                <span className="label-telemetry">TOTAL POPULATION</span>
                <div className="num-oversized text-3xl sm:text-4xl text-slate-100">
                  {zoomedSegment.profile.count.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="measuring-line-x" />

            {/* Dominant Genre Patterns */}
            <div className="relative z-10 space-y-3">
              <span className="label-telemetry">DOMINANT GENRE PATTERNS</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {zoomedSegment.profile.dominant_genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/15 text-slate-200 text-xs font-mono uppercase tracking-wider"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Algorithmic Personalization Strategy */}
            <div className="relative z-10 p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 font-mono text-xs">
              <span className="label-telemetry text-sky-400">ALGORITHMIC RECOMMENDATION STRATEGY</span>
              <p className="text-slate-200 text-sm font-light leading-relaxed font-sans">
                {zoomedSegment.personalization_strategy}
              </p>
            </div>
          </div>

          {/* Curated Catalog Trajectories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="label-telemetry">CATALOG TRAJECTORIES</span>
                <h3 className="text-xl font-bold text-slate-100 font-sans">
                  Pre-Computed Recommendations for System 0{zoomedSegment.segment_id}
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {zoomedSegment.recommendations.length} TITLES
              </span>
            </div>

            <div className="space-y-3">
              {zoomedSegment.recommendations.map((title, idx) => (
                <div
                  key={`${title}-${idx}`}
                  className="p-5 rounded-2xl bg-[#060A14]/80 border border-white/[0.08] flex items-center justify-between font-mono"
                >
                  <div className="flex items-center space-x-4">
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-sky-400 text-xs font-bold">
                      TRJ-0{idx + 1}
                    </span>
                    <span className="text-base font-bold text-slate-100 font-sans">{title}</span>
                  </div>
                  <span className="text-xs text-slate-400">CORE CENTROID MATCH</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Simulate Trigger */}
          <div className="p-8 rounded-3xl bg-[#060A14]/60 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-base font-bold text-slate-100">Simulate a viewer inside this cluster?</h4>
              <p className="text-xs text-slate-400 font-light mt-1">
                Test how the real-time API handles inputs matching this behavioral profile.
              </p>
            </div>

            <button
              onClick={() => onNavigate('analyze')}
              className="px-6 py-3 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-widest transition"
            >
              LAUNCH SIMULATOR →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
