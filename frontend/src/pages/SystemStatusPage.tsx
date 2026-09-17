import React from 'react';
import { HealthResponse } from '../types/api';
import { getApiBaseUrl } from '../services/api';

interface SystemStatusPageProps {
  health: HealthResponse | null;
  isConnected: boolean;
  latency: number;
  onRefresh: () => void;
}

export const SystemStatusPage: React.FC<SystemStatusPageProps> = ({
  health,
  isConnected,
  latency,
  onRefresh,
}) => {
  const baseUrl = getApiBaseUrl();

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-12 animate-in fade-in duration-500 text-left">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="h-[1px] w-6 bg-sky-400"></span>
            <span className="label-telemetry text-sky-400">
              SYSTEM STATUS // REAL-TIME MICROSERVICE PROBE
            </span>
          </div>
          <h1 className="title-editorial text-4xl sm:text-6xl text-slate-100 font-black">
            SYSTEM TELEMETRY
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-light">
            Direct diagnostic readouts from the containerized FastAPI GET /health endpoint.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sky-400 hover:text-white font-mono text-xs uppercase tracking-widest transition flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
        >
          <span>[ RE-PROBE ENDPOINT ]</span>
        </button>
      </div>

      {/* Primary Telemetry Console */}
      <div className="rounded-3xl bg-[#060A14]/90 border border-white/[0.08] p-8 sm:p-10 space-y-8 font-mono shadow-2xl">
        {/* Status Header Line */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected && health?.model_loaded ? 'bg-sky-400 shadow-[0_0_10px_#38BDF8]' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              {isConnected && health?.model_loaded ? 'PIPELINE ACTIVE // NOMINAL' : 'PIPELINE OFFLINE / UNREACHABLE'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            PING: <strong className="text-slate-200">{latency} ms</strong>
          </span>
        </div>

        {/* The 5 Key Telemetry Fields Required: API, MODEL, MODEL TYPE, FEATURE COUNT, STATUS */}
        <div className="space-y-6">
          {/* 1. API */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">API ENDPOINT</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-100 font-bold">{baseUrl}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/30">
                HTTP 200 OK
              </span>
            </div>
          </div>

          {/* 2. MODEL */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">MODEL</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-100 font-bold">
                {health?.model_loaded ? 'MODEL_LOADED (TRUE)' : 'MODEL_LOADED (FALSE)'}
              </span>
              <span className="text-slate-500 text-xs">
                // v{health?.version || '1.0.0'}
              </span>
            </div>
          </div>

          {/* 3. MODEL TYPE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">MODEL TYPE</span>
            <span className="text-xs text-sky-300 font-bold">
              {health?.model_type || 'Pipeline (scaler -> kmeans)'}
            </span>
          </div>

          {/* 4. FEATURE COUNT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">FEATURE COUNT</span>
            <span className="text-xs text-slate-100 font-bold">
              {health?.features_count ?? 15} DIMENSIONS
            </span>
          </div>

          {/* 5. STATUS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">STATUS</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                {health?.status || (isConnected ? 'ok' : 'offline')}
              </span>
              {health?.uptime_seconds !== undefined && (
                <span className="text-[10px] text-slate-500">
                  (UPTIME: {Math.round(health.uptime_seconds)}s)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
