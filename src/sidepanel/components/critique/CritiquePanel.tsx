import React, { useState, useEffect, useRef } from 'react';
import type { DesignCritique, CritiqueItem, CritiqueWeakness, CritiqueSection } from '@shared/types';

interface CritiquePanelProps {
  critique: DesignCritique | null;
  loading?: boolean;
}

// ===== Donut Chart =====
const DonutScore: React.FC<{ score: number; size?: number; strokeWidth?: number }> = ({
  score,
  size = 120,
  strokeWidth = 10,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let start: number | null = null;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(eased * score));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = animatedScore >= 80 ? '#51cf66' : animatedScore >= 60 ? '#fcc419' : animatedScore >= 40 ? '#ff922b' : '#ff6b6b';

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-dark-3/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.1s ease',
            filter: `drop-shadow(0 0 8px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {animatedScore}
        </span>
        <span className="text-[9px] text-gray-500 font-medium">/ 100</span>
      </div>
    </div>
  );
};

// ===== Severity Badge =====
const SeverityBadge: React.FC<{ severity: CritiqueWeakness['severity'] }> = ({ severity }) => {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    major: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    minor: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    cosmetic: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${styles[severity]}`}>
      {severity}
    </span>
  );
};

// ===== Effort Badge =====
const EffortBadge: React.FC<{ effort: CritiqueWeakness['estimatedEffort'] }> = ({ effort }) => {
  const dots = effort === 'low' ? 1 : effort === 'medium' ? 2 : 3;
  return (
    <div className="flex items-center gap-0.5" title={`Effort: ${effort}`}>
      {[1, 2, 3].map((d) => (
        <div
          key={d}
          className={`w-1.5 h-1.5 rounded-full ${d <= dots ? 'bg-brand-400' : 'bg-dark-3/50'}`}
        />
      ))}
      <span className="text-[8px] text-gray-600 ml-1">{effort}</span>
    </div>
  );
};

// ===== Category Section Score =====
const CategoryScore: React.FC<{
  label: string;
  section: CritiqueSection;
  icon: React.ReactNode;
}> = ({ label, section, icon }) => {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = section.score >= 80 ? 'text-emerald-400' : section.score >= 60 ? 'text-amber-400' : 'text-red-400';
  const barColor = section.score >= 80 ? 'bg-emerald-400' : section.score >= 60 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="rounded-xl border border-dark-3/30 bg-dark-2/30 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-2/50 transition-colors"
      >
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-300">{label}</span>
            <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>
              {section.score}
            </span>
          </div>
          <div className="w-full h-1 bg-dark-3/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${section.score}%` }}
            />
          </div>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 animate-in border-t border-dark-3/20">
          <p className="text-[11px] text-gray-400 leading-relaxed">{section.summary}</p>
          {section.details.length > 0 && (
            <div className="space-y-1">
              {section.details.map((d, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-500">
                  <span className="mt-0.5 text-gray-600">-</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
          {section.recommendations.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-brand-400">
                Recommendations
              </span>
              {section.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-400">
                  <svg className="w-3 h-3 mt-0.5 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== Main Panel =====
export const CritiquePanel: React.FC<CritiquePanelProps> = ({ critique, loading = false }) => {
  const [expandedWeakness, setExpandedWeakness] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-dark-3/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-sm font-semibold text-gray-300">Analyzing Design</h3>
        <p className="mt-1.5 text-xs text-gray-500">AI is critiquing the design system...</p>
      </div>
    );
  }

  if (!critique) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Critique Yet</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Run a design critique to get an AI-powered analysis of the scraped design system.
        </p>
      </div>
    );
  }

  const categories: { label: string; section: CritiqueSection; icon: React.ReactNode }[] = [
    {
      label: 'Visual Hierarchy',
      section: critique.visualHierarchy,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
    },
    {
      label: 'Whitespace',
      section: critique.whitespace,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
    },
    {
      label: 'Color Harmony',
      section: critique.colorHarmony,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" /></svg>,
    },
    {
      label: 'Typography',
      section: critique.typographyCritique,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12M3 20.25V3.75A2.25 2.25 0 0 1 5.25 1.5h13.5A2.25 2.25 0 0 1 21 3.75v16.5A2.25 2.25 0 0 1 18.75 22.5H5.25A2.25 2.25 0 0 1 3 20.25Z" /></svg>,
    },
    {
      label: 'CTA Effectiveness',
      section: critique.ctaEffectiveness,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg>,
    },
    {
      label: 'Mobile First',
      section: critique.mobileFirst,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
    },
    {
      label: 'Emotional Design',
      section: critique.emotionalDesign,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>,
    },
    {
      label: 'Brand Consistency',
      section: critique.brandConsistency,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
    },
    {
      label: 'Micro-interactions',
      section: critique.microinteractions,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>,
    },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      <div className="px-4 py-4 space-y-5">
        {/* Overall score */}
        <div className="flex flex-col items-center text-center animate-in">
          <DonutScore score={critique.overallScore} />
          <h3 className="mt-3 text-sm font-semibold text-gray-200">Overall Design Score</h3>
          <p className="mt-1 text-[11px] text-gray-500 max-w-[280px] leading-relaxed">
            {critique.executiveSummary}
          </p>
        </div>

        {/* Innovation score */}
        <div className="flex items-center justify-between rounded-xl border border-dark-3/30 bg-dark-2/30 px-3 py-2.5 animate-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <div>
              <span className="text-xs text-gray-300 font-medium">Innovation Score</span>
              <p className="text-[9px] text-gray-500">{critique.innovationAssessment}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-purple-400 tabular-nums">
            {critique.innovationScore}
          </span>
        </div>

        {/* Strengths */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Strengths
          </h4>
          <div className="space-y-2">
            {critique.strengths.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3 animate-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-emerald-300">{s.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.evidence}</p>
                    <p className="text-[10px] text-emerald-400/70 mt-1">{s.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Weaknesses
          </h4>
          <div className="space-y-2">
            {critique.weaknesses.map((w, i) => {
              const isExpanded = expandedWeakness === i;
              const borderColor =
                w.severity === 'critical'
                  ? 'border-red-500/20 bg-red-500/5'
                  : w.severity === 'major'
                  ? 'border-orange-500/20 bg-orange-500/5'
                  : w.severity === 'minor'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-blue-500/20 bg-blue-500/5';

              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 transition-all duration-300 ${borderColor} animate-in`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-200">{w.title}</p>
                        <SeverityBadge severity={w.severity} />
                      </div>
                      <p className="text-[10px] text-gray-500">{w.evidence}</p>
                      <div className="mt-1.5">
                        <EffortBadge effort={w.estimatedEffort} />
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedWeakness(isExpanded ? null : i)}
                      className="flex-shrink-0 rounded-md p-1 hover:bg-dark-3/30 transition-colors"
                      title={isExpanded ? 'Hide fix' : 'How to fix'}
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-dark-3/30 animate-in">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                        </svg>
                        <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider">
                          How to Fix
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {w.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category scores */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Category Breakdown
          </h4>
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <CategoryScore key={i} label={cat.label} section={cat.section} icon={cat.icon} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
