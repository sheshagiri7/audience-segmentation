import React from 'react';
import { ShieldCheck, Cpu, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-[#03060C]/90 text-[#94A3B8] text-xs py-8 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center space-x-3 text-[#94A3B8] text-[11px]">
          <span className="font-bold text-[#E2E8F0] tracking-widest uppercase">EVENT HORIZON</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">AUDIENCE GRAVITATIONAL INTELLIGENCE</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-[#94A3B8]">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>K-MEANS PIPELINE (K=4)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-300"></span>
            <span>15D BEHAVIORAL SPACE</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>DETERMINISTIC INFERENCE</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
