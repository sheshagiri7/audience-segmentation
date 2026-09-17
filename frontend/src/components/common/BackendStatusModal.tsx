import React, { useState } from 'react';
import { X, Server, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkHealth } from '../../services/api';
import { HealthResponse } from '../../types/api';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  latency: number;
  isConnected: boolean;
  onRefresh: () => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({
  isOpen,
  onClose,
  health,
  latency,
  isConnected,
  onRefresh,
}) => {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestResult(null);
    setApiBaseUrl(urlInput);
    
    const res = await checkHealth();
    setTesting(false);
    
    if (res.ok) {
      setTestResult({
        ok: true,
        message: `Connected successfully! Latency: ${res.latencyMs}ms. Model loaded: ${res.data?.model_loaded ? 'Yes' : 'No'}`,
      });
      onRefresh();
    } else {
      setTestResult({
        ok: false,
        message: `Failed: ${res.error || 'Connection refused'}`,
      });
    }
  };

  const setPreset = (url: string) => {
    setUrlInput(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#060A14] border border-white/15 rounded-3xl shadow-2xl p-6 overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-400/10 border border-sky-400/30 rounded-xl text-sky-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-sans">MICROSERVICE GATEWAY TELEMETRY</h3>
              <p className="text-[11px] text-slate-400">Audience Segmentation REST Diagnostic Probe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Live Status */}
        <div className="mt-5 p-4 rounded-2xl bg-[#0A1124] border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>ONLINE & RESPONSIVE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>OFFLINE / UNREACHABLE</span>
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400">{latency} ms</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-500 block text-[10px]">HEALTH PROBE:</span>
              <span className="text-slate-200 font-bold uppercase">{health?.status || 'unreachable'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-500 block text-[10px]">MODEL LOADED:</span>
              <span className={`font-bold ${health?.model_loaded ? 'text-sky-400' : 'text-amber-400'}`}>
                {health?.model_loaded ? 'TRUE (READY)' : isConnected ? 'FALSE' : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* URL Target Config */}
        <div className="mt-5 space-y-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            API SERVER BASE URL
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
            />
            <button
              onClick={handleSaveAndTest}
              disabled={testing}
              className="px-4 py-2.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center space-x-2 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Test</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Presets:</span>
            <button
              onClick={() => setPreset('http://localhost:8000')}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[11px] transition"
            >
              :8000 (FastAPI)
            </button>
            <button
              onClick={() => setPreset('http://127.0.0.1:8000')}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[11px] transition"
            >
              127.0.0.1:8000
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                testResult.ok
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* API Contract Reference Info */}
        <div className="mt-5 p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center justify-between">
            <span>Expected Hackathon API Endpoints:</span>
            <span className="text-[11px] text-sky-400 font-mono">Problem Statement §7</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            • <span className="text-emerald-400">GET</span> /health → &#123; status: "ok", model_loaded: true &#125;
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            • <span className="text-sky-400">POST</span> /recommend → &#123; user_id, segment_id, recommendations... &#125;
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
