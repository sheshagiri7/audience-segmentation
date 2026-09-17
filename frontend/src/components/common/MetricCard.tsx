import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: LucideIcon;
  color?: 'purple' | 'cyan' | 'crimson' | 'emerald' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendPositive = true,
  icon: Icon,
  color = 'purple',
}) => {
  const colorStyles = {
    purple: {
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/10',
      iconText: 'text-purple-400',
      glow: 'hover:border-purple-500/40 hover:shadow-glow-purple',
    },
    cyan: {
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10',
      iconText: 'text-cyan-400',
      glow: 'hover:border-cyan-500/40 hover:shadow-glow-cyan',
    },
    crimson: {
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/10',
      iconText: 'text-rose-400',
      glow: 'hover:border-rose-500/40 hover:shadow-glow-crimson',
    },
    emerald: {
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10',
      iconText: 'text-emerald-400',
      glow: 'hover:border-emerald-500/40 hover:shadow-glow-emerald',
    },
    amber: {
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10',
      iconText: 'text-amber-400',
      glow: 'hover:border-amber-500/40',
    },
  }[color];

  return (
    <div className={`glass-card p-5 rounded-2xl border transition-all duration-300 ${colorStyles.border} ${colorStyles.glow}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${colorStyles.iconBg} ${colorStyles.iconText}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendPositive
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
