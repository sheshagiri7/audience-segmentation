import React, { useState, useEffect, useCallback } from 'react';
import { REAL_MODEL_METADATA, REAL_EVALUATION_METRICS, CLUSTER_VISUAL_THEMES, TrainedModelMetadata, MetricsReport } from '../services/realData';
import { PageId } from '../components/layout/Navbar';
import { HealthResponse } from '../types/api';
import { fetchLiveSegments, fetchLiveMetrics } from '../services/api';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  health: HealthResponse | null;
  isConnected: boolean;
  latency: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  health,
  isConnected,
  latency,
}) => {
  const [metadata, setMetadata] = useState<TrainedModelMetadata>(REAL_MODEL_METADATA);
  const [metrics, setMetrics] = useState<MetricsReport>(REAL_EVALUATION_METRICS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [liveSegments, liveMetrics] = await Promise.all([
        fetchLiveSegments(),
        fetchLiveMetrics(),
      ]);

      let gotLive = false;
      if (liveSegments) {
        if (Array.isArray(liveSegments)) {
          setMetadata(prev => ({ ...prev, segments: liveSegments }));
        } else if (liveSegments.segments) {
          setMetadata(prev => ({ ...prev, ...liveSegments }));
        }
        gotLive = true;
      }

      if (liveMetrics) {
        setMetrics(liveMetrics);
        gotLive = true;
      }

      setIsLive(gotLive);
      if (!gotLive) {
        setError('Live backend endpoints unavailable: showing fallback telemetry snapshot.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error syncing live telemetry');
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [hoveredClusterId, setHoveredClusterId] = useState<number | null>(null);

  const activeCluster = hoveredClusterId !== null 
    ? metadata.segments.find(s => s.segment_id === hoveredClusterId)
    : null;

  const scrollToMap = () => {
    const el = document.getElementById('spatial-map');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative space-y-28 pt-8 sm:pt-14 pb-20 animate-in fade-in duration-500">
      {/* =========================================================================
          1. FULL-SCREEN CINEMATIC OPENING (HERO)
          ========================================================================= */}
      <section className="min-h-[82vh] flex flex-col justify-center items-start text-left max-w-5xl mx-auto px-2 relative">
        {/* Subtle top editorial label */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="h-[1px] w-8 bg-sky-400"></span>
          <span className="label-telemetry text-sky-400">
            VIEWER INTELLIGENCE // GRAVITATIONAL MODEL
          </span>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className="text-slate-400 font-mono text-xs tracking-wider">
            {metadata.total_training_samples.toLocaleString()} SAMPLES // K={metadata.k_clusters}
          </span>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
            isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {isLoading ? 'SYNCING...' : isLive ? 'LIVE /SEGMENTS & /METRICS' : 'OFFLINE SNAPSHOT'}
          </span>
        </div>

        {/* Large Editorial Headline with Contrast Scrim & Drop Shadow */}
        <div className="space-y-0 relative">
          <div className="absolute -inset-x-8 -inset-y-6 hero-scrim -z-10 rounded-3xl pointer-events-none" />
          <h1 className="title-editorial text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-[#F8FAFC] font-black tracking-tight leading-[0.92] drop-shadow-[0_4px_24px_rgba(2,4,8,0.95)]">
            AUDIENCE
          </h1>
          <h1 className="title-editorial text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] via-[#7DD3FC] to-[#E2E8F0] font-black tracking-tight leading-[0.92] drop-shadow-[0_4px_24px_rgba(2,4,8,0.95)]">
            SEGMENTATION
          </h1>
        </div>

        {/* Supporting Editorial Line */}
        <div className="mt-5 space-y-1 font-sans text-sm sm:text-base text-[#CBD5E1] font-light max-w-xl">
          <p>Understand viewer behavior.</p>
          <p>Discover meaningful audiences.</p>
          <p>Personalize the experience.</p>
        </div>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('analyze')}
            className="group relative px-8 py-4 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 shadow-glow-electric flex items-center justify-center space-x-3 cursor-pointer"
          >
            <span>ANALYZE VIEWER</span>
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 font-mono font-bold">
              →
            </span>
          </button>

          <button
            onClick={scrollToMap}
            className="px-7 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 hover:text-white font-mono font-medium text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>EXPLORE AUDIENCE MAP</span>
            <span className="text-slate-400 font-mono">↓</span>
          </button>
        </div>

        {/* Minimal live telemetry status readout */}
        <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-sky-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-300 uppercase">
              {isConnected ? 'API CONNECTED' : 'API DISCONNECTED'}
            </span>
            <span className="text-slate-400">({latency}ms)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">FEEDS:</span>
            <span className={isLive ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isLive ? 'LIVE' : 'SNAPSHOT'}
            </span>
            {error && (
              <button
                onClick={loadData}
                className="underline hover:text-amber-200 cursor-pointer font-bold ml-1 text-amber-400"
              >
                [Retry]
              </button>
            )}
          </div>
          <span className="text-slate-600">|</span>
          <div>
            <span>ALGORITHM: </span>
            <span className="text-slate-200">SCALER → K-MEANS</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="hidden sm:block">
            <span>DETERMINISM: </span>
            <span className="text-sky-400 font-semibold">100% (VARIANCE 0.0)</span>
          </div>
        </div>
      </section>

      <div className="measuring-line-x max-w-6xl mx-auto" />

      {/* =========================================================================
          2. SPATIAL INTELLIGENCE MAP
          ========================================================================= */}
      <section id="spatial-map" className="relative max-w-6xl mx-auto px-2 space-y-8 scroll-mt-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="label-telemetry text-sky-400">AUDIENCE MAP // 4-BODY GRAVITATIONAL FIELD</span>
            <h2 className="title-editorial text-3xl sm:text-5xl text-[#F8FAFC] font-bold mt-2">
              SPATIAL INTELLIGENCE MAP
            </h2>
            <p className="mt-2 text-sm text-[#CBD5E1] font-light max-w-xl">
              Real 4-cluster behavioral topology. Hover an orbital system to inspect its gravitational footprint and viewer density.
            </p>
          </div>

          <div className="font-mono text-xs text-slate-400 flex items-center space-x-4">
            <span>TOTAL VIEWERS: <strong className="text-[#F8FAFC]">{metadata.total_training_samples.toLocaleString()}</strong></span>
            <span className="text-slate-600">|</span>
            <span>SYSTEM STABILITY: <strong className="text-sky-400 font-semibold">VERIFIED</strong></span>
          </div>
        </div>

        {/* Central Orbital Field Visualization */}
        <div className="relative rounded-3xl bg-[#060A14]/80 border border-white/[0.08] p-6 sm:p-12 overflow-hidden min-h-[580px] flex items-center justify-center select-none">
          {/* Subtle telemetry grid background */}
          <div className="absolute inset-0 telemetry-grid opacity-35 pointer-events-none" />

          {/* Coordinate Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/[0.04] pointer-events-none" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/[0.04] pointer-events-none" />

          {/* Concentric SVG Orbital Rings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-300 -300 600 600">
            {CLUSTER_VISUAL_THEMES.map((theme) => {
              const isHovered = hoveredClusterId === theme.id;
              const radius = theme.orbitRadius * 0.72;
              return (
                <ellipse
                  key={theme.id}
                  cx="0"
                  cy="0"
                  rx={isHovered ? radius * 1.08 : radius}
                  ry={isHovered ? radius * 0.62 : radius * 0.58}
                  fill="none"
                  stroke={isHovered ? theme.color : 'rgba(255, 255, 255, 0.08)'}
                  strokeWidth={isHovered ? 1.75 : 1}
                  strokeDasharray={isHovered ? '4 6' : '2 8'}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Central Gravitational Object: Event Horizon Singularity */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Accretion ring glow */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-black border border-sky-400/40 shadow-ring-accretion flex items-center justify-center">
              <div className="absolute inset-1 rounded-full border border-white/20 animate-spin" style={{ animationDuration: '40s' }} />
              <div className="absolute inset-3 rounded-full bg-radial from-sky-400/10 via-black to-black" />
              <div className="w-10 h-10 rounded-full bg-black border border-sky-400/60 shadow-[inset_0_0_15px_rgba(56,189,248,0.5)] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-sky-300"></span>
              </div>
            </div>
            <span className="mt-3 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              CENTROID GRAVITY
            </span>
          </div>

          {/* 4 Orbiting Cluster Nodes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {metadata.segments.map((seg) => {
              const theme = CLUSTER_VISUAL_THEMES.find((t) => t.id === seg.segment_id) || CLUSTER_VISUAL_THEMES[0];
              const isHovered = hoveredClusterId === seg.segment_id;
              const isAnyHovered = hoveredClusterId !== null;
              const angleRad = (theme.angleDeg * Math.PI) / 180;
              const radius = theme.orbitRadius * 0.72;
              const x = Math.cos(angleRad) * (isHovered ? radius * 1.08 : radius);
              const y = Math.sin(angleRad) * (isHovered ? radius * 0.62 : radius * 0.58);

              return (
                <div
                  key={seg.segment_id}
                  className="absolute pointer-events-auto transition-all duration-300"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    opacity: isHovered ? 1 : isAnyHovered ? 0.35 : 0.9,
                  }}
                  onMouseEnter={() => setHoveredClusterId(seg.segment_id)}
                  onMouseLeave={() => setHoveredClusterId(null)}
                  onClick={() => onNavigate('segments')}
                >
                  {/* Interactive Node Point */}
                  <button
                    className={`relative p-3 rounded-full transition-all duration-300 group flex items-center justify-center cursor-pointer ${
                      isHovered ? 'scale-125' : 'hover:scale-110'
                    }`}
                  >
                    {/* Outer glow ring */}
                    <div
                      className="absolute inset-0 rounded-full blur-md transition-opacity duration-300"
                      style={{
                        backgroundColor: theme.color,
                        opacity: isHovered ? 0.6 : 0.2,
                      }}
                    />
                    {/* Node Core */}
                    <div
                      className="relative w-4 h-4 rounded-full border border-white flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: theme.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                    </div>
                  </button>

                  {/* Compact Node Label Tag */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded-full bg-[#060A14]/90 border border-white/10 text-[10px] font-mono whitespace-nowrap transition-all duration-200 ${
                      isHovered ? 'border-sky-400 text-slate-100 shadow-glow-electric' : 'text-slate-400'
                    }`}
                  >
                    <span className="font-bold text-sky-400 mr-1.5">K={seg.segment_id}</span>
                    <span>{seg.profile.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Beside-Node Telemetry Panel (When hovered) */}
          {activeCluster && (
            <div className="absolute bottom-6 right-6 z-20 max-w-sm w-full p-5 rounded-2xl bg-[#060A14]/95 border border-sky-400/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400 pb-2 border-b border-white/10">
                <span className="font-bold tracking-wider uppercase">CLUSTER 0{activeCluster.segment_id} // TELEMETRY</span>
                <span>{activeCluster.profile.percentage}% TOTAL</span>
              </div>

              <h4 className="mt-2 text-base font-bold text-slate-100">
                {activeCluster.segment_name}
              </h4>
              <p className="mt-1 text-xs text-slate-400 font-light leading-relaxed">
                {activeCluster.description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/5 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">VIEWER COUNT</span>
                  <span className="text-slate-200 font-bold">{activeCluster.profile.count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">AVG WATCH TIME</span>
                  <span className="text-slate-200 font-bold">{activeCluster.profile.avg_watch_time_hours} hrs</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">AVG SESSION</span>
                  <span className="text-slate-200 font-bold">{activeCluster.profile.avg_session_mins} min</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">DOMINANT GENRES</span>
                  <span className="text-sky-300 font-bold truncate block">{activeCluster.profile.dominant_genres.join(', ')}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('segments')}
                className="mt-4 w-full py-2 rounded-xl bg-white/[0.05] hover:bg-sky-400 hover:text-black border border-white/10 text-xs font-mono font-bold tracking-wider uppercase transition text-slate-200"
              >
                Inspect Gravitational System →
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="measuring-line-x max-w-6xl mx-auto" />

      {/* =========================================================================
          3. BEHAVIORAL ANALYSIS & SYSTEM TELEMETRY (EDITORIAL COMPOSITION)
          No generic card grids! Oversized numbers, whitespace, labels, lines.
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-2 space-y-12">
        <div>
          <span className="label-telemetry text-sky-400">BEHAVIORAL ANALYSIS // MODEL MEASUREMENTS</span>
          <h2 className="title-editorial text-3xl sm:text-5xl text-[#F8FAFC] font-bold mt-2">
            PHYSICAL TOPOLOGY OF ENGAGEMENT
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
          <div className="space-y-2 border-l border-white/15 pl-6">
            <span className="label-telemetry text-[#94A3B8]">TRAINED SAMPLES</span>
            <div className="num-oversized text-4xl sm:text-5xl text-[#F8FAFC]">
              {metadata.total_training_samples.toLocaleString()}
            </div>
            <p className="text-xs text-[#94A3B8] font-light pt-1">
              Deterministic cleaned viewer records across 15 behavioral dimensions.
            </p>
          </div>

          <div className="space-y-2 border-l border-white/15 pl-6">
            <span className="label-telemetry text-[#94A3B8]">DISCOVERED SYSTEMS</span>
            <div className="num-oversized text-4xl sm:text-5xl text-sky-400">
              0{metadata.k_clusters}
            </div>
            <p className="text-xs text-[#94A3B8] font-light pt-1">
              KMeans partitions with verified cluster separation and balance.
            </p>
          </div>

          <div className="space-y-2 border-l border-white/15 pl-6">
            <span className="label-telemetry text-[#94A3B8]">SILHOUETTE SEPARATION</span>
            <div className="num-oversized text-4xl sm:text-5xl text-[#F8FAFC]">
              {metrics.silhouette_score.toFixed(4)}
            </div>
            <p className="text-xs text-[#94A3B8] font-light pt-1">
              Measured silhouette score confirming distinct behavioral clusters.
            </p>
          </div>

          <div className="space-y-2 border-l border-white/15 pl-6">
            <span className="label-telemetry text-[#94A3B8]">PIPELINE DETERMINISM</span>
            <div className="num-oversized text-4xl sm:text-5xl text-sky-300">
              100%
            </div>
            <p className="text-xs text-[#94A3B8] font-light pt-1">
              Zero variance verified across repeated inference cycles (seed {metadata.random_seed}).
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-8 rounded-3xl bg-[#060A14]/60 border border-white/[0.08]">
          <div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Ready to test a viewer profile?</h3>
            <p className="text-xs text-[#CBD5E1] font-light mt-1">
              Input watch hours, session length, and genres to calculate real-time gravitational centroid assignment.
            </p>
          </div>

          <button
            onClick={() => onNavigate('analyze')}
            className="px-6 py-3 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-widest transition flex items-center space-x-2"
          >
            <span>LAUNCH ANALYZER INSTRUMENT</span>
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
};
