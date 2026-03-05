import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import type { AppSettings, ScoringWeights } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('SettingsPanel');

interface FieldConfig {
  key: keyof AppSettings;
  label: string;
  group: string;
  placeholder?: string;
}

const apiFields: FieldConfig[] = [
  { key: 'claudeApiKey', label: 'Claude API Key', group: 'Anthropic', placeholder: 'sk-ant-...' },
  { key: 'braveApiKey', label: 'Brave API Key', group: 'Brave Search', placeholder: 'BSA...' },
  { key: 'supabaseUrl', label: 'Supabase URL', group: 'Supabase', placeholder: 'https://your-project.supabase.co' },
  { key: 'supabaseAnonKey', label: 'Supabase Anon Key', group: 'Supabase', placeholder: 'eyJ...' },
  { key: 'hotjarApiKey', label: 'Hotjar API Key', group: 'Hotjar', placeholder: 'API key' },
  { key: 'hotjarSiteId', label: 'Hotjar Site ID', group: 'Hotjar', placeholder: '1234567' },
  { key: 'fullstoryApiKey', label: 'FullStory API Key', group: 'FullStory', placeholder: 'API key' },
  { key: 'fullstoryOrgId', label: 'FullStory Org ID', group: 'FullStory', placeholder: 'o-XXXXX-na1' },
  { key: 'firecrawlApiKey', label: 'Firecrawl API Key', group: 'Firecrawl', placeholder: 'fc-...' },
  { key: 'exaApiKey', label: 'Exa API Key', group: 'Exa', placeholder: 'exa-...' },
];

const weightLabels: Record<keyof ScoringWeights, string> = {
  industryFit: 'Industry Fit',
  audienceAlignment: 'Audience Alignment',
  conversionOptimization: 'Conversion Optimization',
  accessibilityCompliance: 'Accessibility Compliance',
  performance: 'Performance',
  designTrend: 'Design Trend',
};

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

export const SettingsPanel: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const loadSettings = useStore((s) => s.loadSettings);
  const saveSettings = useStore((s) => s.saveSettings);

  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleFieldChange = useCallback(
    (key: keyof AppSettings, value: string) => {
      updateSettings({ [key]: value } as Partial<AppSettings>);
    },
    [updateSettings]
  );

  const handleWeightChange = useCallback(
    (key: keyof ScoringWeights, value: number) => {
      updateSettings({
        scoringWeights: { ...settings.scoringWeights, [key]: value },
      });
    },
    [settings.scoringWeights, updateSettings]
  );

  const toggleVisibility = useCallback((key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await saveSettings();
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings]);

  const handleTestConnection = useCallback(
    async (group: string) => {
      setTestResults((prev) => ({ ...prev, [group]: { status: 'testing' } }));

      try {
        let messageType = '';
        switch (group) {
          case 'Anthropic':
            messageType = 'TEST_CLAUDE';
            break;
          case 'Brave Search':
            messageType = 'TEST_BRAVE';
            break;
          case 'Supabase':
            messageType = 'TEST_SUPABASE';
            break;
          case 'Hotjar':
            messageType = 'TEST_HOTJAR';
            break;
          case 'FullStory':
            messageType = 'TEST_FULLSTORY';
            break;
          case 'Firecrawl':
            messageType = 'TEST_FIRECRAWL';
            break;
          case 'Exa':
            messageType = 'TEST_EXA';
            break;
        }

        const response = await chrome.runtime.sendMessage({ type: messageType });
        const result = response as { success: boolean; message?: string } | undefined;

        if (result?.success) {
          setTestResults((prev) => ({
            ...prev,
            [group]: { status: 'success', message: 'Connected' },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [group]: { status: 'error', message: result?.message || 'Connection failed' },
          }));
        }
      } catch (err) {
        log.error(`Test connection failed for ${group}`, err);
        setTestResults((prev) => ({
          ...prev,
          [group]: { status: 'error', message: 'Extension context unavailable' },
        }));
      }

      setTimeout(() => {
        setTestResults((prev) => ({ ...prev, [group]: { status: 'idle' } }));
      }, 5000);
    },
    []
  );

  // Group fields by service
  const groups = Array.from(new Set(apiFields.map((f) => f.group)));

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      <div className="sticky top-0 z-10 border-b border-dark-3/50 bg-dark-0/95 backdrop-blur-sm px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">API keys and scoring configuration</p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* API Keys by group */}
        {groups.map((group) => {
          const groupFields = apiFields.filter((f) => f.group === group);
          const test = testResults[group];

          return (
            <div key={group}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400">{group}</h3>
                <button
                  onClick={() => handleTestConnection(group)}
                  disabled={test?.status === 'testing'}
                  className={`
                    rounded-md px-2 py-1 text-[10px] font-medium transition-colors
                    ${
                      test?.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : test?.status === 'error'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-dark-2 text-gray-500 hover:text-gray-300 hover:bg-dark-3'
                    }
                    disabled:opacity-50
                  `}
                >
                  {test?.status === 'testing' ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 border border-gray-500 border-t-brand-500 rounded-full animate-spin" />
                      Testing...
                    </span>
                  ) : test?.status === 'success' ? (
                    'Connected'
                  ) : test?.status === 'error' ? (
                    test.message || 'Failed'
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>

              <div className="space-y-2">
                {groupFields.map((field) => {
                  const fieldValue = settings[field.key] as string;
                  const isVisible = visibleFields[field.key] ?? false;

                  return (
                    <div key={field.key}>
                      <label className="block text-[11px] text-gray-500 mb-1">{field.label}</label>
                      <div className="relative">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={fieldValue}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="
                            w-full rounded-lg border border-dark-3/70 bg-dark-2/50 px-3 py-2
                            text-xs text-gray-200 placeholder:text-gray-600
                            focus:border-brand-500/50 focus:outline-none
                            transition-colors pr-9
                          "
                        />
                        <button
                          onClick={() => toggleVisibility(field.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          aria-label={isVisible ? 'Hide value' : 'Show value'}
                        >
                          {isVisible ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Output path */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2">Output</h3>
          <label className="block text-[11px] text-gray-500 mb-1">Output Base Path</label>
          <input
            type="text"
            value={settings.outputBasePath}
            onChange={(e) => handleFieldChange('outputBasePath', e.target.value)}
            placeholder="~/Desktop"
            className="
              w-full rounded-lg border border-dark-3/70 bg-dark-2/50 px-3 py-2
              text-xs text-gray-200 placeholder:text-gray-600
              focus:border-brand-500/50 focus:outline-none transition-colors
            "
          />
        </div>

        {/* Scoring weights */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">Scoring Weights</h3>
          <div className="space-y-3">
            {(Object.keys(weightLabels) as Array<keyof ScoringWeights>).map((key) => {
              const value = settings.scoringWeights[key];
              const total = Object.values(settings.scoringWeights).reduce((a, b) => a + b, 0);

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-gray-400">{weightLabels[key]}</label>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      {value}% ({Math.round((value / total) * 100)}% of total)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) => handleWeightChange(key, parseInt(e.target.value, 10))}
                    className="
                      w-full h-1.5 rounded-full appearance-none cursor-pointer
                      bg-dark-3/50
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3.5
                      [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-brand-500
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-dark-0
                      [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                    "
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 pb-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white
              transition-all duration-200
              hover:bg-brand-500 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMessage && (
            <p
              className={`mt-2 text-center text-[11px] animate-in ${
                saveMessage.includes('success') ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
