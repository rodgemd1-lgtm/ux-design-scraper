import React, { useState, useCallback } from 'react';
import { MSG } from '@shared/message-types';
import type { WorkflowConfig } from '@shared/workflow-types';

const DESIGN_STYLES = [
  { value: 'luxury', label: 'Luxury' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'playful', label: 'Playful' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'tech', label: 'Tech' },
  { value: 'organic', label: 'Organic' },
] as const;

const INDUSTRIES = [
  'SaaS', 'E-commerce', 'Finance', 'Healthcare', 'Education',
  'Media', 'Travel', 'Real Estate', 'Food & Beverage', 'Fashion',
  'Automotive', 'Non-profit', 'Government', 'Gaming', 'Other',
] as const;

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.startsWith('http') ? str : `https://${str}`);
    return !!url.hostname.includes('.');
  } catch {
    return false;
  }
}

export const WorkflowSetup: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['', '']);
  const [goal, setGoal] = useState('');
  const [industry, setIndustry] = useState('SaaS');
  const [targetAudience, setTargetAudience] = useState('');
  const [designStyle, setDesignStyle] = useState('minimal');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCompetitor = useCallback(() => {
    if (competitorUrls.length < 5) {
      setCompetitorUrls((prev) => [...prev, '']);
    }
  }, [competitorUrls.length]);

  const removeCompetitor = useCallback((index: number) => {
    if (competitorUrls.length > 2) {
      setCompetitorUrls((prev) => prev.filter((_, i) => i !== index));
    }
  }, [competitorUrls.length]);

  const updateCompetitor = useCallback((index: number, value: string) => {
    setCompetitorUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  }, []);

  const canSubmit =
    projectName.trim() &&
    primaryUrl.trim() &&
    isValidUrl(primaryUrl) &&
    goal.trim() &&
    targetAudience.trim() &&
    competitorUrls.filter((u) => u.trim()).every(isValidUrl) &&
    competitorUrls.filter((u) => u.trim()).length >= 2;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    const config: WorkflowConfig = {
      projectName: projectName.trim(),
      primaryUrl: primaryUrl.trim().startsWith('http') ? primaryUrl.trim() : `https://${primaryUrl.trim()}`,
      competitorUrls: competitorUrls
        .filter((u) => u.trim())
        .map((u) => (u.trim().startsWith('http') ? u.trim() : `https://${u.trim()}`)),
      projectContext: {
        goal: goal.trim(),
        industry,
        targetAudience: targetAudience.trim(),
        designStyle,
      },
      autoAdvance,
    };

    try {
      await chrome.runtime.sendMessage({
        type: MSG.WORKFLOW_START,
        payload: config,
      });
    } catch {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, projectName, primaryUrl, competitorUrls, goal, industry, targetAudience, designStyle, autoAdvance]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-3/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
            <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">New Workflow</h2>
            <p className="text-[10px] text-gray-500">Configure and start a Double Diamond workflow</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Acme Corp Redesign"
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Primary URL */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Primary URL
          </label>
          <input
            type="text"
            value={primaryUrl}
            onChange={(e) => setPrimaryUrl(e.target.value)}
            placeholder="https://example.com"
            className={`w-full rounded-lg bg-dark-2 border px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors ${
              primaryUrl && !isValidUrl(primaryUrl)
                ? 'border-red-500/50 focus:border-red-500/80'
                : 'border-dark-3/50 focus:border-brand-500/50'
            }`}
          />
          {primaryUrl && !isValidUrl(primaryUrl) && (
            <p className="text-[9px] text-red-400 mt-1">Please enter a valid URL</p>
          )}
        </div>

        {/* Competitor URLs */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Competitor URLs (2-5)
            </label>
            {competitorUrls.length < 5 && (
              <button
                onClick={addCompetitor}
                className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                + Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {competitorUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  placeholder={`Competitor ${i + 1} URL`}
                  className={`flex-1 rounded-lg bg-dark-2 border px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors ${
                    url && !isValidUrl(url)
                      ? 'border-red-500/50 focus:border-red-500/80'
                      : 'border-dark-3/50 focus:border-brand-500/50'
                  }`}
                />
                {competitorUrls.length > 2 && (
                  <button
                    onClick={() => removeCompetitor(i)}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-dark-3/30" />
          <span className="text-[8px] uppercase tracking-widest text-gray-600 font-semibold">Context</span>
          <div className="h-px flex-1 bg-dark-3/30" />
        </div>

        {/* Goal */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Project Goal
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What are you trying to achieve with this redesign?"
            rows={2}
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none resize-none"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Industry
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 focus:border-brand-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Target Audience
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. B2B SaaS decision-makers, 30-50 years"
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Design Style */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Design Style
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {DESIGN_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => setDesignStyle(style.value)}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                  designStyle === style.value
                    ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30'
                    : 'bg-dark-2 text-gray-500 hover:text-gray-300 hover:bg-dark-3/40'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-advance */}
        <div className="flex items-center justify-between rounded-lg bg-dark-2/50 border border-dark-3/30 px-3 py-2.5">
          <div>
            <span className="text-xs font-medium text-gray-300">Auto-advance</span>
            <p className="text-[9px] text-gray-600 mt-0.5">Skip manual approval on non-gate phases</p>
          </div>
          <button
            onClick={() => setAutoAdvance(!autoAdvance)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
              autoAdvance ? 'bg-brand-500' : 'bg-dark-3'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                autoAdvance ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-4 py-3 border-t border-dark-3/30 flex-shrink-0">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500/20 px-4 py-2.5 text-xs font-semibold text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
              Starting Workflow...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Workflow
            </>
          )}
        </button>
        {!canSubmit && projectName.trim() && (
          <p className="text-[9px] text-gray-600 text-center mt-1.5">
            Fill in all required fields and add at least 2 competitor URLs
          </p>
        )}
      </div>
    </div>
  );
};
