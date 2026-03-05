import { create } from 'zustand';
import { createChatSlice, type ChatSlice } from './slices/chat-slice';
import { createScrapeSlice, type ScrapeSlice } from './slices/scrape-slice';
import { createProjectSlice, type ProjectSlice } from './slices/project-slice';
import { createSettingsSlice, type SettingsSlice } from './slices/settings-slice';
import { createWorkflowSlice, type WorkflowSlice } from './slices/workflow-slice';

export type AppStore = ChatSlice & ScrapeSlice & ProjectSlice & SettingsSlice & WorkflowSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createChatSlice(...a),
  ...createScrapeSlice(...a),
  ...createProjectSlice(...a),
  ...createSettingsSlice(...a),
  ...createWorkflowSlice(...a),
}));
