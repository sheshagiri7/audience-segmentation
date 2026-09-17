import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Terminal, Clock, Radio } from 'lucide-react';
import { ApiTelemetry } from '../../types/api';

interface JsonViewerProps {
  telemetry: ApiTelemetry | null;
  title?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  telemetry,
  title = 'Live Backend API Telemetry (Inspect Network Request & Response)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!telemetry) return null;

  const copyToClipboard = () => {
    const content = JSON.stringify(
      {
        endpoint: telemetry.endpointUrl,
        http_status: telemetry.status,
        latency_ms: telemetry.latencyMs,
        timestamp: telemetry.timestamp,
        request: telemetry.requestPayload,
        response: telemetry.responsePayload,
        error: telemetry.error || null,
      },
      null,
      2
    );

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 flex items-center justify-between text-left transition"
      >
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-4 h-4 text-ott-cyan" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              telemetry.status === 200
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : telemetry.status === 0
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
            }`}
          >
            {telemetry.status === 0 ? 'NETWORK ERROR' : `HTTP ${telemetry.status}`}
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline flex items-center space-x-1">
            <Clock className="w-3 h-3 inline mr-1" />
            <span>{telemetry.latencyMs}ms</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {isOpen ? 'Collapse Payload' : 'Expand Payload'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-white/10 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <Radio className="w-3.5 h-3.5 text-ott-violet" />
              <span>Target:</span>
              <span className="text-slate-200">{telemetry.endpointUrl}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center space-x-1 text-[11px]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Request Payload */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase text-ott-cyan tracking-wider">
                Request Body (POST /recommend)
              </div>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-60 overflow-y-auto">
                {JSON.stringify(telemetry.requestPayload, null, 2)}
              </pre>
            </div>

            {/* Response Payload */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase text-emerald-400 tracking-wider">
                Response Body (Real ML Output)
              </div>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-60 overflow-y-auto">
                {telemetry.responsePayload
                  ? JSON.stringify(telemetry.responsePayload, null, 2)
                  : JSON.stringify({ error: telemetry.error }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
