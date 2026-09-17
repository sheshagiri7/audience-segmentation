import React, { useState } from 'react';
import { ViewerProfileRequest, RecommendResponse, ApiTelemetry } from '../types/api';
import { postRecommend } from '../services/api';
import { CLUSTER_VISUAL_THEMES, getRealSegmentById } from '../services/realData';
import { recordViewerAnalysis } from '../services/gamification';
import { DistanceGauge } from '../components/common/DistanceGauge';
import { RecommendationCard } from '../components/common/RecommendationCard';
import { JsonViewer } from '../components/common/JsonViewer';

const REAL_GENRES = [
  'Action',
  'Thriller',
  'Sci-Fi',
  'Drama',
  'Comedy',
  'Documentary',
  'Animation',
  'Family',
  'Romance',
  'Horror',
  'Crime',
  'Adventure',
];

const PRESETS = [
  { id: 'USR-8192', label: 'Action/Thriller Pro', watchTime: 32.5, session: 85, genres: ['Action', 'Thriller'] },
  { id: 'USR-2001', label: 'Casual Short-Session', watchTime: 7.5, session: 25, genres: ['Comedy', 'Animation'] },
  { id: 'USR-3001', label: 'Genre-Explorer', watchTime: 26.0, session: 60, genres: ['Adventure', 'Sci-Fi', 'Documentary'] },
  { id: 'USR-4001', label: 'Low-Activity', watchTime: 2.5, session: 20, genres: ['Family'] },
];

export const ViewerAnalysisPage: React.FC = () => {
  // Input parameters
  const [userId, setUserId] = useState('USR-8192');
  const [watchTimeHours, setWatchTimeHours] = useState<number>(32.5);
  const [avgSessionMins, setAvgSessionMins] = useState<number>(85.0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action', 'Thriller']);

  // Scientific transition states
  const [analyzing, setAnalyzing] = useState(false);
  const [transitionStep, setTransitionStep] = useState<number>(0);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [telemetry, setTelemetry] = useState<ApiTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customGenre, setCustomGenre] = useState('');

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const addCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (trimmed) {
      setSelectedGenres((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setCustomGenre('');
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setUserId(preset.id);
    setWatchTimeHours(preset.watchTime);
    setAvgSessionMins(preset.session);
    setSelectedGenres([...preset.genres]);
    setResult(null);
    setError(null);
  };

  const resetDefaults = () => {
    setUserId('USR-8192');
    setWatchTimeHours(32.5);
    setAvgSessionMins(85.0);
    setSelectedGenres(['Action', 'Thriller']);
    setResult(null);
    setError(null);
  };

  const generateRandomUser = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setUserId(`USR-${num}`);
  };

  const handleBeginAnalysis = async () => {
    // Inline validation
    if (!userId.trim()) {
      setError('Viewer ID cannot be empty or whitespace. Please enter an alphanumeric identifier.');
      return;
    }
    if (isNaN(watchTimeHours) || watchTimeHours < 0) {
      setError('Watch time must be a non-negative number (>= 0.0 hrs).');
      return;
    }
    if (isNaN(avgSessionMins) || avgSessionMins < 0) {
      setError('Session duration must be a non-negative number (>= 0 mins).');
      return;
    }

    setAnalyzing(true);
    setTransitionStep(1); // SIGNAL DETECTED
    setError(null);
    setResult(null);

    const payload: ViewerProfileRequest = {
      user_id: userId.trim(),
      watch_time_hours: watchTimeHours,
      avg_session_mins: avgSessionMins,
      top_genres: selectedGenres,
    };

    // Fast responsive telemetry progression (120ms per stage)
    const stepTimer = setInterval(() => {
      setTransitionStep((s) => (s < 3 ? s + 1 : s));
    }, 120);

    try {
      const res = await postRecommend(payload);
      clearInterval(stepTimer);
      setTransitionStep(4); // PERSONALIZATION READY immediately on arrival
      await new Promise((r) => setTimeout(r, 100));
      setTelemetry(res.telemetry);

      if (res.data) {
        setResult(res.data);
        recordViewerAnalysis(res.data.segment_id);
      } else {
        setError(res.telemetry.error || 'Microservice failed to return cluster affinity');
      }
    } catch (err: any) {
      clearInterval(stepTimer);
      setError(err?.message || 'Network exception communicating with backend');
    } finally {
      setAnalyzing(false);
      setTransitionStep(0);
    }
  };

  const activeVisual = result !== null
    ? CLUSTER_VISUAL_THEMES.find((t) => t.id === result.segment_id) || CLUSTER_VISUAL_THEMES[0]
    : null;

  const segmentProfile = result !== null ? getRealSegmentById(result.segment_id) : null;

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-12 animate-in fade-in duration-500">
      {/* Editorial Header */}
      <div className="space-y-3 text-left">
        <div className="flex items-center space-x-3">
          <span className="h-[1px] w-6 bg-sky-400"></span>
          <span className="label-telemetry text-sky-400">
            VIEWER INTELLIGENCE // REAL-TIME SENSOR INSTRUMENT
          </span>
        </div>
        <h1 className="title-editorial text-4xl sm:text-6xl text-[#F8FAFC] font-black">
          VIEWER PROFILE ANALYSIS
        </h1>
        <p className="text-sm sm:text-base text-[#CBD5E1] font-light max-w-xl">
          Calibrate viewer engagement coordinates and discover real-time gravitational cluster assignment via scikit-learn model inference.
        </p>
      </div>

      {/* =========================================================================
          CENTRAL ANALYSIS AREA
          ========================================================================= */}
      <div className="relative rounded-3xl bg-[#060A14]/90 border border-white/[0.08] p-6 sm:p-10 space-y-10 shadow-2xl">
        {/* Subtle grid background */}
        <div className="absolute inset-0 telemetry-grid opacity-25 pointer-events-none rounded-3xl" />

        {/* STEP 1: VIEWER IDENTIFIER */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-telemetry text-sky-400">STEP 1 // VIEWER IDENTIFIER</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={resetDefaults}
                disabled={analyzing}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition"
                title="Reset to default baseline profile"
              >
                [ RESET DEFAULTS ]
              </button>
              <button
                onClick={generateRandomUser}
                disabled={analyzing}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 transition"
              >
                [ RANDOMIZE ID ]
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              disabled={analyzing}
              className="text-4xl sm:text-6xl font-black font-mono text-slate-100 bg-transparent border-b border-white/20 focus:border-sky-400 focus:outline-none transition tracking-tight max-w-md"
            />

            {/* Presets Quick Toggles */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  disabled={analyzing}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition border ${
                    userId === p.id
                      ? 'bg-sky-400/10 border-sky-400 text-sky-300 font-bold'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="measuring-line-x" />

        {/* STEP 2: BEHAVIORAL METRICS */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* WATCH TIME */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-telemetry text-sky-400">STEP 2A // WATCH TIME</span>
              <span className="text-xs font-mono text-slate-500">HOURS WATCHED</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <input
                type="number"
                step="any"
                value={watchTimeHours}
                onChange={(e) => setWatchTimeHours(parseFloat(e.target.value) || 0)}
                disabled={analyzing}
                className="num-oversized text-3xl sm:text-5xl text-slate-100 bg-transparent border-b border-white/20 focus:border-sky-400 focus:outline-none w-36 font-mono"
              />
              <span className="text-sm font-mono text-sky-400 uppercase">HOURS</span>
            </div>

            <input
              type="range"
              min="0.0"
              max="80.0"
              step="0.5"
              value={Math.min(Math.max(watchTimeHours, 0), 80)}
              onChange={(e) => setWatchTimeHours(parseFloat(e.target.value))}
              disabled={analyzing}
              className="w-full accent-sky-400 bg-slate-800 h-1 rounded-lg cursor-pointer"
            />
          </div>

          {/* SESSION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-telemetry text-sky-400">STEP 2B // AVERAGE SESSION</span>
              <span className="text-xs font-mono text-slate-500">SESSION LENGTH</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <input
                type="number"
                step="any"
                value={avgSessionMins}
                onChange={(e) => setAvgSessionMins(parseFloat(e.target.value) || 0)}
                disabled={analyzing}
                className="num-oversized text-3xl sm:text-5xl text-slate-100 bg-transparent border-b border-white/20 focus:border-sky-400 focus:outline-none w-36 font-mono"
              />
              <span className="text-sm font-mono text-sky-400 uppercase">MIN</span>
            </div>

            <input
              type="range"
              min="0"
              max="180"
              step="5"
              value={Math.min(Math.max(avgSessionMins, 0), 180)}
              onChange={(e) => setAvgSessionMins(parseInt(e.target.value))}
              disabled={analyzing}
              className="w-full accent-sky-400 bg-slate-800 h-1 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="measuring-line-x" />

        {/* STEP 3: GENRES MATRIX */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-telemetry text-sky-400">STEP 3 // TOP GENRE AFFINITIES</span>
            <span className="text-xs font-mono text-slate-500">
              {selectedGenres.length} SELECTED
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {REAL_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  disabled={analyzing}
                  className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-150 border ${
                    isSelected
                      ? 'bg-sky-400 text-slate-950 font-bold border-sky-400 shadow-glow-electric'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
            {/* Show any selected custom genres that aren't in REAL_GENRES */}
            {selectedGenres
              .filter((g) => !REAL_GENRES.includes(g))
              .map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  disabled={analyzing}
                  className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-150 border bg-sky-400 text-slate-950 font-bold border-sky-400 shadow-glow-electric"
                >
                  {genre} ✕
                </button>
              ))}
          </div>

          {/* Custom Genre Input */}
          <div className="flex items-center space-x-2 pt-1 max-w-sm">
            <input
              type="text"
              placeholder="Add custom / unknown genre..."
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomGenre()}
              disabled={analyzing}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-200 focus:border-sky-400 focus:outline-none w-full"
            />
            <button
              onClick={addCustomGenre}
              disabled={analyzing || !customGenre.trim()}
              className="px-3 py-1.5 rounded-lg bg-sky-400/20 hover:bg-sky-400/40 border border-sky-400/40 text-sky-300 font-mono text-xs cursor-pointer whitespace-nowrap"
            >
              + ADD
            </button>
          </div>
        </div>

        {/* STEP 4: BEGIN ANALYSIS ACTION BUTTON */}
        <div className="relative z-10 pt-4">
          <button
            onClick={handleBeginAnalysis}
            disabled={analyzing}
            className="w-full py-5 rounded-2xl bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-mono font-bold text-sm sm:text-base uppercase tracking-widest transition-all duration-200 shadow-glow-electric flex items-center justify-center space-x-3 cursor-pointer"
          >
            <span>{analyzing ? 'PROCESSING ORBITAL DISCOVERY...' : '[ STEP 4 // EXECUTE ORBITAL ANALYSIS ]'}</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
            <strong>TELEMETRY ERROR:</strong> {error}
          </div>
        )}
      </div>

      {/* =========================================================================
          TRANSITION SEQUENCE OVERLAY
          SIGNAL DETECTED -> BEHAVIOR MAPPED -> CLUSTER IDENTIFIED -> PERSONALIZATION READY
          ========================================================================= */}
      {analyzing && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#060A14]/95 border border-sky-400/40 text-center space-y-6 animate-in fade-in duration-200">
          <span className="label-telemetry text-sky-400">TELEMETRY DIAGNOSTIC SEQUENCE</span>

          <div className="space-y-4 max-w-sm mx-auto font-mono text-xs sm:text-sm font-bold">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 1 ? 'bg-sky-400/10 border-sky-400 text-[#F8FAFC]' : 'border-white/10 text-[#94A3B8]'
            }`}>
              <span>SIGNAL DETECTED</span>
              <span>{transitionStep >= 1 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-500">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 2 ? 'bg-sky-400/10 border-sky-400 text-[#F8FAFC]' : 'border-white/10 text-[#94A3B8]'
            }`}>
              <span>BEHAVIOR MAPPED</span>
              <span>{transitionStep >= 2 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-500">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 3 ? 'bg-sky-400/10 border-sky-400 text-[#F8FAFC]' : 'border-white/10 text-[#94A3B8]'
            }`}>
              <span>CLUSTER IDENTIFIED</span>
              <span>{transitionStep >= 3 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-500">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 4 ? 'bg-sky-400/10 border-sky-400 text-[#F8FAFC]' : 'border-white/10 text-[#94A3B8]'
            }`}>
              <span>PERSONALIZATION READY</span>
              <span>{transitionStep >= 4 ? '✓' : '...'}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REAL API RESPONSE REVEAL
          Prominently displays: segment ID, segment name, recommendations, distance
          ========================================================================= */}
      {result && !analyzing && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Segment ID & Name Hero Banner */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#060A14]/90 border border-sky-400/40 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full bg-sky-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider">
                    CLUSTER 0{result.segment_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    INFERENCE: {result.inference_time_ms ? result.inference_time_ms.toFixed(2) : (telemetry?.latencyMs || 0)}ms
                  </span>
                </div>

                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] font-sans tracking-tight">
                  {result.segment_name}
                </h2>

                {segmentProfile && (
                  <p className="mt-2 text-sm text-[#CBD5E1] font-light max-w-xl leading-relaxed">
                    {segmentProfile.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end font-mono text-xs text-slate-400 space-y-1">
                <span>USER: <strong className="text-[#F8FAFC]">{result.user_id}</strong></span>
                <span>ENGAGEMENT: <strong className="text-sky-300">{result.raw_features?.watch_time_hours}h / {result.raw_features?.avg_session_mins}m</strong></span>
                <span>STATUS: <strong className="text-sky-400">IDENTIFIED</strong></span>
              </div>
            </div>
          </div>

          {/* Radial / Orbital Distance to Centroid */}
          <DistanceGauge distance={result.distance_to_centroid} />

          {/* Recommendations as Trajectory Vectors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="label-telemetry text-sky-400">PERSONALIZATION VECTORS</span>
                <h3 className="text-xl font-bold text-[#F8FAFC] font-sans">
                  Recommended Catalog Trajectories
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {result.recommendations.length} VECTORS PROJECTED
              </span>
            </div>

            <div className="space-y-3">
              {result.recommendations.map((title, idx) => (
                <RecommendationCard
                  key={`${title}-${idx}`}
                  title={title}
                  index={idx}
                  segmentName={result.segment_name}
                />
              ))}
            </div>
          </div>

          {/* Raw JSON Debug Telemetry */}
          <JsonViewer telemetry={telemetry} />

          {/* Recalibrate / New Analysis Button */}
          <div className="pt-4 text-center">
            <button
              onClick={() => setResult(null)}
              className="px-8 py-3.5 rounded-full bg-sky-400/10 hover:bg-sky-400 hover:text-slate-950 border border-sky-400/40 text-sky-300 font-mono text-xs uppercase tracking-widest transition flex items-center space-x-2 mx-auto cursor-pointer"
            >
              <span>[ ANALYZE ANOTHER VIEWER → ]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
