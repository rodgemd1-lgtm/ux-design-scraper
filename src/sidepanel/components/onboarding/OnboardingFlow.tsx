import React, { useState, useCallback, useEffect } from 'react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 0 | 1 | 2 | 3 | 4;

interface KeyValidation {
  testing: boolean;
  valid: boolean | null;
  error?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [claudeKey, setClaudeKey] = useState('');
  const [braveKey, setBraveKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [hotjarKey, setHotjarKey] = useState('');
  const [fullstoryKey, setFullstoryKey] = useState('');

  const [claudeValidation, setClaudeValidation] = useState<KeyValidation>({ testing: false, valid: null });
  const [braveValidation, setBraveValidation] = useState<KeyValidation>({ testing: false, valid: null });

  // Check for existing keys
  useEffect(() => {
    chrome.storage?.local?.get(
      ['claudeApiKey', 'braveApiKey', 'supabaseUrl', 'supabaseAnonKey', 'hotjarApiKey', 'fullstoryApiKey'],
      (result) => {
        if (result.claudeApiKey) setClaudeKey(result.claudeApiKey);
        if (result.braveApiKey) setBraveKey(result.braveApiKey);
        if (result.supabaseUrl) setSupabaseUrl(result.supabaseUrl);
        if (result.supabaseAnonKey) setSupabaseKey(result.supabaseAnonKey);
        if (result.hotjarApiKey) setHotjarKey(result.hotjarApiKey);
        if (result.fullstoryApiKey) setFullstoryKey(result.fullstoryApiKey);
      }
    );
  }, []);

  const testClaudeKey = useCallback(async () => {
    if (!claudeKey.trim()) return;
    setClaudeValidation({ testing: true, valid: null });
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (response.ok || response.status === 200) {
        setClaudeValidation({ testing: false, valid: true });
        chrome.storage?.local?.set({ claudeApiKey: claudeKey.trim() });
      } else if (response.status === 401) {
        setClaudeValidation({ testing: false, valid: false, error: 'Invalid API key' });
      } else {
        // Rate limit or other response is still valid
        setClaudeValidation({ testing: false, valid: true });
        chrome.storage?.local?.set({ claudeApiKey: claudeKey.trim() });
      }
    } catch (err) {
      setClaudeValidation({
        testing: false,
        valid: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  }, [claudeKey]);

  const testBraveKey = useCallback(async () => {
    if (!braveKey.trim()) return;
    setBraveValidation({ testing: true, valid: null });
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=test&count=1`,
        {
          headers: {
            'X-Subscription-Token': braveKey.trim(),
            Accept: 'application/json',
          },
        }
      );
      if (response.ok) {
        setBraveValidation({ testing: false, valid: true });
        chrome.storage?.local?.set({ braveApiKey: braveKey.trim() });
      } else {
        setBraveValidation({
          testing: false,
          valid: false,
          error: response.status === 401 ? 'Invalid API key' : `Error: ${response.status}`,
        });
      }
    } catch (err) {
      setBraveValidation({
        testing: false,
        valid: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  }, [braveKey]);

  const saveOptionalKeys = useCallback(() => {
    if (supabaseUrl.trim()) chrome.storage?.local?.set({ supabaseUrl: supabaseUrl.trim() });
    if (supabaseKey.trim()) chrome.storage?.local?.set({ supabaseAnonKey: supabaseKey.trim() });
    if (hotjarKey.trim()) chrome.storage?.local?.set({ hotjarApiKey: hotjarKey.trim() });
    if (fullstoryKey.trim()) chrome.storage?.local?.set({ fullstoryApiKey: fullstoryKey.trim() });
  }, [supabaseUrl, supabaseKey, hotjarKey, fullstoryKey]);

  const nextStep = useCallback(() => {
    if (step === 3) saveOptionalKeys();
    if (step < 4) setStep((step + 1) as OnboardingStep);
    else onComplete();
  }, [step, saveOptionalKeys, onComplete]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep((step - 1) as OnboardingStep);
  }, [step]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return claudeValidation.valid === true;
      case 2: return braveValidation.valid === true;
      case 3: return true; // optional
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-dark-0">
      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto scrollbar-thin">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center animate-in max-w-[320px]">
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-brand-500/15 border border-brand-500/20">
              <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-100">Welcome to UX Scraper</h2>
            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              The most powerful design intelligence tool for extracting, analyzing, and reconstructing web design systems.
            </p>
            <div className="mt-6 space-y-2">
              {[
                'Deep-scrape any website design system',
                'AI-powered design critique and scoring',
                'Generate React components from scraped designs',
                'Competitive intelligence across multiple sites',
                'Export to Claude Code, Figma, Storybook, and more',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-left animate-in" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                  <svg className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-[11px] text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Claude API Key */}
        {step === 1 && (
          <div className="w-full max-w-[320px] animate-in">
            <div className="text-center mb-6">
              <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/20">
                <svg className="h-6 w-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-200">Claude API Key</h3>
              <p className="mt-1 text-[11px] text-gray-500">
                Required for AI analysis, critique, and component reconstruction.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => { setClaudeKey(e.target.value); setClaudeValidation({ testing: false, valid: null }); }}
                  placeholder="sk-ant-..."
                  className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2.5 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors"
                />
              </div>

              <button
                onClick={testClaudeKey}
                disabled={!claudeKey.trim() || claudeValidation.testing}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500/20 py-2.5 text-xs font-medium text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-40"
              >
                {claudeValidation.testing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 0 1 0-12.728m12.728 0a9 9 0 0 1 0 12.728m-9.9-2.829a5 5 0 0 1 0-7.07m7.072 0a5 5 0 0 1 0 7.07M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>

              {claudeValidation.valid === true && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 animate-in">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-[11px] text-emerald-400 font-medium">Connected successfully</span>
                </div>
              )}

              {claudeValidation.valid === false && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 animate-in">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <span className="text-[11px] text-red-400">{claudeValidation.error || 'Invalid key'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Brave Search API Key */}
        {step === 2 && (
          <div className="w-full max-w-[320px] animate-in">
            <div className="text-center mb-6">
              <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/20">
                <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-200">Brave Search API</h3>
              <p className="mt-1 text-[11px] text-gray-500">
                Required for competitive research and finding competitor URLs.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">
                  Brave Search API Key
                </label>
                <input
                  type="password"
                  value={braveKey}
                  onChange={(e) => { setBraveKey(e.target.value); setBraveValidation({ testing: false, valid: null }); }}
                  placeholder="BSA..."
                  className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2.5 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors"
                />
              </div>

              <button
                onClick={testBraveKey}
                disabled={!braveKey.trim() || braveValidation.testing}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500/20 py-2.5 text-xs font-medium text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-40"
              >
                {braveValidation.testing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 0 1 0-12.728m12.728 0a9 9 0 0 1 0 12.728m-9.9-2.829a5 5 0 0 1 0-7.07m7.072 0a5 5 0 0 1 0 7.07M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>

              {braveValidation.valid === true && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 animate-in">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-[11px] text-emerald-400 font-medium">Connected successfully</span>
                </div>
              )}

              {braveValidation.valid === false && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 animate-in">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <span className="text-[11px] text-red-400">{braveValidation.error || 'Invalid key'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Optional keys */}
        {step === 3 && (
          <div className="w-full max-w-[320px] animate-in">
            <div className="text-center mb-6">
              <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-200">Optional Integrations</h3>
              <p className="mt-1 text-[11px] text-gray-500">
                These are optional. You can configure them later in Settings.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">Supabase URL</label>
                <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxx.supabase.co" className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">Supabase Anon Key</label>
                <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} placeholder="eyJ..." className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">Hotjar API Key</label>
                <input type="password" value={hotjarKey} onChange={(e) => setHotjarKey(e.target.value)} placeholder="Optional" className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">FullStory API Key</label>
                <input type="password" value={fullstoryKey} onChange={(e) => setFullstoryKey(e.target.value)} placeholder="Optional" className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none font-mono transition-colors" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Ready */}
        {step === 4 && (
          <div className="text-center animate-in max-w-[320px]">
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-100">You are all set!</h2>
            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              Start by chatting with the AI assistant, or navigate to any page and begin scraping its design system.
            </p>
            <div className="mt-6 space-y-2">
              <div className="rounded-lg border border-dark-3/30 bg-dark-2/30 p-3 text-left">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
                  Quick Start
                </p>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-400">
                    1. Navigate to any website you want to analyze
                  </p>
                  <p className="text-[11px] text-gray-400">
                    2. Open this side panel and go to Chat
                  </p>
                  <p className="text-[11px] text-gray-400">
                    3. Tell the AI what you are building and ask it to scrape
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-dark-3/30">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`transition-all duration-300 rounded-full ${
                s === step
                  ? 'w-5 h-1.5 bg-brand-500'
                  : s < step
                  ? 'w-1.5 h-1.5 bg-brand-500/50'
                  : 'w-1.5 h-1.5 bg-dark-3/50'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Back
            </button>
          )}
          {step === 0 && (
            <button
              onClick={onSkip}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={step === 4 ? onComplete : nextStep}
            disabled={!canProceed()}
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 4 ? 'Get Started' : step === 3 ? 'Skip / Next' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
