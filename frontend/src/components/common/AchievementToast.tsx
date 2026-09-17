import React, { useEffect, useState } from 'react';
import { Compass, X } from 'lucide-react';
import { UserSessionFeedback } from '../../services/gamification';
import { getRealSegmentById } from '../../services/realData';

interface DiscoveryToast {
  id: string;
  segmentId: number;
  segmentName: string;
}

export const AchievementToast: React.FC = () => {
  const [toasts, setToasts] = useState<DiscoveryToast[]>([]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const state: UserSessionFeedback = e.detail;
      if (state.lastDiscoveredSegmentId !== null) {
        const seg = getRealSegmentById(state.lastDiscoveredSegmentId);
        if (seg) {
          const id = String(Date.now());
          setToasts((prev) => [
            ...prev,
            { id, segmentId: seg.segment_id, segmentName: seg.segment_name },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000);
        }
      }
    };

    window.addEventListener('spectra-session-update', handleUpdate);
    return () => window.removeEventListener('spectra-session-update', handleUpdate);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center space-x-3 p-4 rounded-2xl bg-[#060A14]/95 backdrop-blur-xl border border-sky-400/40 shadow-2xl shadow-glow-electric animate-in slide-in-from-bottom-4 duration-300 max-w-sm font-mono"
        >
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <div className="flex-1 text-left">
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">
              SEGMENT DISCOVERED // PATTERN DETECTED
            </div>
            <h4 className="text-xs font-bold text-slate-100 mt-0.5 font-sans">
              System 0{toast.segmentId}: {toast.segmentName}
            </h4>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="p-1 text-slate-500 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
