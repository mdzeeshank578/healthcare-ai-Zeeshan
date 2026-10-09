import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down';
  subtitle?: string;
  badgeColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = 'up',
  subtitle,
  badgeColor = 'bg-blue-50 text-[#1976D2]',
}) => {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold text-slate-500">{title}</span>
        <div className={`p-2 sm:p-2.5 rounded-xl ${badgeColor} shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between flex-wrap gap-1">
        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</span>
        {trend && (
          <span
            className={`flex items-center text-[11px] sm:text-xs font-semibold ${
              trendDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trendDirection === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
            )}
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-[11px] sm:text-xs text-slate-400 font-medium">{subtitle}</p>}
    </div>
  );
};