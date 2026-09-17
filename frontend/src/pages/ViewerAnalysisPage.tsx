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
  { id: 'USR-4201', label: 'Casual Binge', watchTime: 6.5, session: 22, genres: ['Comedy'] },
  { id: 'USR-5539', label: 'Multi-Genre Explorer', watchTime: 22.0, session: 55, genres: ['Drama', 'Sci-Fi', 'Documentary'] },
  { id: 'USR-1094', label: 'Low Activity', watchTime: 2.8, session: 14, genres: ['Animation'] },
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

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre));
      }
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setUserId(preset.id);
    setWatchTimeHours(preset.watchTime);
    setAvgSessionMins(preset.session);
    setSelectedGenres(preset.genres);
    setResult(null);
    setError(null);
  };

  const generateRandomUser = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setUserId(`USR-${num}`);
  };

  const handleBeginAnalysis = async () => {
    setAnalyzing(true);
    setTransitionStep(1);
    setError(null);
    setResult(null);

    // Sequence the 4 transition stages requested:
    // SIGNAL DETECTED -> BEHAVIOR MAPPED -> CLUSTER IDENTIFIED -> PERSONALIZATION READY
    await new Promise((r) => setTimeout(r, 320));
    setTransitionStep(2);
    await new Promise((r) => setTimeout(r, 320));
    setTransitionStep(3);
    await new Promise((r) => setTimeout(r, 320));
    setTransitionStep(4);

    try {
      const payload: ViewerProfileRequest = {
        user_id: userId,
        watch_time_hours: watchTimeHours,
        avg_session_mins: avgSessionMins,
        top_genres: selectedGenres,
      };

      const res = await postRecommend(payload);
      setTelemetry(res.telemetry);

      if (res.data) {
        setResult(res.data);
        recordViewerAnalysis(res.data.segment_id);
      } else {
        setError(res.telemetry.error || 'Microservice failed to return cluster affinity');
      }
    } catch (err: any) {
      setError(err?.message || 'Network exception communicating with backend');
    } finally {
      await new Promise((r) => setTimeout(r, 200));
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
        <h1 className="title-editorial text-4xl sm:text-6xl text-slate-100 font-black">
          VIEWER PROFILE ANALYSIS
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-light max-w-xl">
          Calibrate viewer engagement coordinates and discover real-time gravitational cluster assignment via scikit-learn model inference.
        </p>
      </div>

      {/* =========================================================================
          CENTRAL ANALYSIS AREA
          ========================================================================= */}
      <div className="relative rounded-3xl bg-[#060A14]/90 border border-white/[0.08] p-6 sm:p-10 space-y-10 shadow-2xl">
        {/* Subtle grid background */}
        <div className="absolute inset-0 telemetry-grid opacity-25 pointer-events-none rounded-3xl" />

        {/* 1. VIEWER PROFILE ID */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-telemetry">VIEWER PROFILE</span>
            <div className="flex items-center space-x-2">
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

        {/* 2. WATCH TIME & SESSION METRICS */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* WATCH TIME */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-telemetry">WATCH TIME</span>
              <span className="text-xs font-mono text-slate-500">0.5 - 80.0 HRS</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="num-oversized text-4xl sm:text-5xl text-slate-100">
                {watchTimeHours.toFixed(1)}
              </span>
              <span className="text-sm font-mono text-sky-400 uppercase">HOURS</span>
            </div>

            <input
              type="range"
              min="0.5"
              max="80.0"
              step="0.5"
              value={watchTimeHours}
              onChange={(e) => setWatchTimeHours(parseFloat(e.target.value))}
              disabled={analyzing}
              className="w-full accent-sky-400 bg-slate-800 h-1 rounded-lg cursor-pointer"
            />
          </div>

          {/* SESSION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-telemetry">SESSION</span>
              <span className="text-xs font-mono text-slate-500">5 - 180 MIN</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="num-oversized text-4xl sm:text-5xl text-slate-100">
                {Math.round(avgSessionMins)}
              </span>
              <span className="text-sm font-mono text-sky-400 uppercase">MIN</span>
            </div>

            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={avgSessionMins}
              onChange={(e) => setAvgSessionMins(parseInt(e.target.value))}
              disabled={analyzing}
              className="w-full accent-sky-400 bg-slate-800 h-1 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="measuring-line-x" />

        {/* 3. GENRES MATRIX */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-telemetry">GENRES</span>
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
          </div>
        </div>

        {/* 4. BEGIN ANALYSIS ACTION BUTTON */}
        <div className="relative z-10 pt-4">
          <button
            onClick={handleBeginAnalysis}
            disabled={analyzing}
            className="w-full py-5 rounded-2xl bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-mono font-bold text-sm sm:text-base uppercase tracking-widest transition-all duration-200 shadow-glow-electric flex items-center justify-center space-x-3 cursor-pointer"
          >
            <span>{analyzing ? 'PROCESSING ORBITAL DISCOVERY...' : '[ BEGIN ANALYSIS ]'}</span>
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
              transitionStep >= 1 ? 'bg-sky-400/10 border-sky-400 text-slate-100' : 'border-white/5 text-slate-600'
            }`}>
              <span>SIGNAL DETECTED</span>
              <span>{transitionStep >= 1 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-600">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 2 ? 'bg-sky-400/10 border-sky-400 text-slate-100' : 'border-white/5 text-slate-600'
            }`}>
              <span>BEHAVIOR MAPPED</span>
              <span>{transitionStep >= 2 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-600">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 3 ? 'bg-sky-400/10 border-sky-400 text-slate-100' : 'border-white/5 text-slate-600'
            }`}>
              <span>CLUSTER IDENTIFIED</span>
              <span>{transitionStep >= 3 ? '✓' : '...'}</span>
            </div>

            <div className="text-slate-600">↓</div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              transitionStep >= 4 ? 'bg-sky-400/10 border-sky-400 text-slate-100' : 'border-white/5 text-slate-600'
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
                    CLUSTER 0${result.segment_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    INFERENCE: {result.inference_time_ms ? result.inference_time_ms.toFixed(2) : (telemetry?.latencyMs || 0)}ms
                  </span>
                </div>

                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-100 font-sans tracking-tight">
                  {result.segment_name}
                </h2>

                {segmentProfile && (
                  <p className="mt-2 text-sm text-slate-400 font-light max-w-xl leading-relaxed">
                    {segmentProfile.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end font-mono text-xs text-slate-400 space-y-1">
                <span>USER: <strong className="text-slate-100">{result.user_id}</strong></span>
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
                <span className="label-telemetry">PERSONALIZATION VECTORS</span>
                <h3 className="text-xl font-bold text-slate-100 font-sans">
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
              className="px-8 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-widest transition"
            >
              [ RE-CALIBRATE / NEW SENSOR RUN ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
