import React from 'react';

interface RecommendationCardProps {
  title: string;
  index: number;
  segmentName: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  index,
  segmentName,
}) => {
  const trajectoryId = `TRJ-0${index + 1}`;

  return (
    <div className="group relative p-5 rounded-2xl bg-[#060A14]/80 border border-white/[0.08] hover:border-sky-400/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
      {/* Left: Vector Identifier & Title */}
      <div className="flex items-start sm:items-center space-x-4">
        <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-sky-400 text-xs font-bold tracking-wider">
          {trajectoryId}
        </span>
        <div>
          <h4 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-sky-300 transition-colors font-sans">
            {title}
          </h4>
          <span className="text-[11px] text-slate-500 uppercase tracking-wider block mt-0.5">
            OPTIMAL TRAJECTORY // {segmentName}
          </span>
        </div>
      </div>

      {/* Right: Telemetry Rank & Affinity */}
      <div className="flex items-center space-x-6 text-xs text-slate-400 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
        <div>
          <span className="text-[9px] text-slate-500 uppercase block">RANKING</span>
          <span className="text-slate-200 font-bold">VECTOR #{index + 1}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-sky-400">
          <span className="text-xs">PROJECTED</span>
          <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
};
