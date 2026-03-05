import type { StateCreator } from 'zustand';
import type { AppSettings } from '@shared/types';
import { STORAGE_KEYS, DEFAULT_SCORING_WEIGHTS } from '@shared/constants';
import { createLogger } from '@shared/logger';

const log = createLogger('SettingsSlice');

const defaultSettings: AppSettings = {
  claudeApiKey: '',
  braveApiKey: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  hotjarApiKey: '',
  hotjarSiteId: '',
  fullstoryApiKey: '',
  fullstoryOrgId: '',
  outputBasePath: '~/Desktop',
  scoringWeights: { ...DEFAULT_SCORING_WEIGHTS },
};

export interface SettingsSlice {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set, get) => ({
  settings: { ...defaultSettings },

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  loadSettings: async () => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const saved = result[STORAGE_KEYS.SETTINGS];
      if (saved) {
        set({ settings: { ...defaultSettings, ...saved } });
        log.info('Settings loaded');
      }
    } catch (err) {
      log.error('Failed to load settings', err);
    }
  },

  saveSettings: async () => {
    try {
      const { settings } = get();
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
      log.info('Settings saved');
    } catch (err) {
      log.error('Failed to save settings', err);
    }
  },
});
