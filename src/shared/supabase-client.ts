import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_KEYS } from './constants';

let supabaseInstance: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) return supabaseInstance;

  const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const appSettings = settings[STORAGE_KEYS.SETTINGS];

  if (!appSettings?.supabaseUrl || !appSettings?.supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be configured in settings');
  }

  supabaseInstance = createClient(appSettings.supabaseUrl, appSettings.supabaseAnonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          const result = await chrome.storage.local.get(key);
          return result[key] ?? null;
        },
        setItem: async (key: string, value: string) => {
          await chrome.storage.local.set({ [key]: value });
        },
        removeItem: async (key: string) => {
          await chrome.storage.local.remove(key);
        },
      },
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

export function resetSupabaseClient(): void {
  supabaseInstance = null;
}
