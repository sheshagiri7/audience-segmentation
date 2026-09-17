import React from 'react';

interface DistanceGaugeProps {
  distance: number;
}

export const DistanceGauge: React.FC<DistanceGaugeProps> = ({ distance }) => {
  // Clamped distance for plotting on 100px radius SVG
  const maxD = 2.5;
  const normalizedD = Math.min(Math.max(distance, 0), maxD);
  const plotRadius = 15 + (normalizedD / maxD) * 70; // 15px to 85px from center

  // Angle in radians (fixed at 45deg for elegant visualization)
  const angle = Math.PI / 4;
  const viewerX = 100 + Math.cos(angle) * plotRadius;
  const viewerY = 100 - Math.sin(angle) * plotRadius;

  let classification = 'CORE GRAVITATIONAL ORBIT';
  let badgeColor = 'text-sky-400 border-sky-500/30 bg-sky-950/20';

  if (distance > 1.4) {
    classification = 'PERIPHERAL TRAJECTORY';
    badgeColor = 'text-slate-300 border-slate-500/30 bg-slate-900/30';
  } else if (distance > 0.7) {
    classification = 'EQUILIBRIUM ORBIT';
    badgeColor = 'text-cyan-300 border-cyan-500/30 bg-cyan-950/20';
  }

  return (
    <div className="p-6 rounded-3xl bg-[#060A14]/90 border border-white/[0.08] space-y-4">
      <div className="flex items-center justify-between">
        <span className="label-telemetry">RADIAL DISTANCE // CENTROID DISPLACEMENT</span>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
          {classification}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
        {/* SVG Orbital Radar Indicator */}
        <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {/* Background gridlines */}
            <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
            <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />

            {/* Concentric orbital rings */}
            <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.12)" />

            {/* Trajectory vector from centroid to viewer */}
            <line
              x1="100"
              y1="100"
              x2={viewerX}
              y2={viewerY}
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Centroid Object (Origin) */}
            <circle cx="100" cy="100" r="4.5" fill="#38BDF8" />
            <circle cx="100" cy="100" r="10" fill="none" stroke="rgba(56,189,248,0.3)" />

            {/* Plotted Viewer Node */}
            <circle cx={viewerX} cy={viewerY} r="7" fill="none" stroke="#38BDF8" strokeWidth="1.5" className="animate-ping opacity-40" />
            <circle cx={viewerX} cy={viewerY} r="5" fill="#E2E8F0" stroke="#38BDF8" strokeWidth="2" />
          </svg>

          {/* Center tiny tag */}
          <span className="absolute text-[8px] font-mono text-slate-500 bottom-2">r = 2.5 MAX</span>
        </div>

        {/* Readout Telemetry */}
        <div className="flex-1 space-y-3 font-mono text-left w-full">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">EUCLIDEAN DISTANCE (d)</span>
            <div className="text-3xl sm:text-4xl font-black text-slate-100 mt-0.5">
              {distance.toFixed(4)}
            </div>
            <span className="text-xs text-slate-400 font-sans">
              15-dimensional distance to cluster center
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">ORBITAL RADIUS</span>
              <span className="text-slate-200 font-bold">{plotRadius.toFixed(1)} px</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">DISPLACEMENT</span>
              <span className="text-sky-300 font-bold">Δ {(distance).toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
