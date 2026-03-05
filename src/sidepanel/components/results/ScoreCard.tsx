import React from 'react';

interface ScoreCardProps {
  label: string;
  score: number;
  size?: 'sm' | 'md';
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score >= 80) return { stroke: '#34d399', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (score >= 60) return { stroke: '#fbbf24', text: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (score >= 40) return { stroke: '#fb923c', text: 'text-orange-400', bg: 'bg-orange-500/10' };
  return { stroke: '#f87171', text: 'text-red-400', bg: 'bg-red-500/10' };
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ label, score, size = 'md' }) => {
  const isMd = size === 'md';
  const radius = isMd ? 36 : 24;
  const strokeWidth = isMd ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;
  const colors = getScoreColor(score);

  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl border border-dark-3/30 ${colors.bg} ${isMd ? 'p-4' : 'p-2.5'}`}>
      <svg width={svgSize} height={svgSize} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-dark-3/40"
        />
        {/* Score ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-circle"
        />
      </svg>
      <div className="flex flex-col items-center -mt-1">
        <span className={`font-bold tabular-nums ${colors.text} ${isMd ? 'text-lg' : 'text-sm'}`}>
          {Math.round(score)}
        </span>
        <span className={`text-gray-500 text-center leading-tight ${isMd ? 'text-[11px]' : 'text-[10px]'}`}>
          {label}
        </span>
      </div>
    </div>
  );
};
