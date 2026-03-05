import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type SidebarTabId } from './components/common/Sidebar';
import { ChatContainer } from './components/chat/ChatContainer';
import { ScrapeProgress } from './components/scrape/ScrapeProgress';
import { PreviewPanel } from './components/scrape/PreviewPanel';
import { ResultsOverview } from './components/results/ResultsOverview';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ComparisonView } from './components/compare/ComparisonView';
import { CritiquePanel } from './components/critique/CritiquePanel';
import { PersonaList } from './components/personas/PersonaList';
import { ReconstructedGallery } from './components/reconstructed/ReconstructedGallery';
import { BatchQueuePanel } from './components/batch/BatchQueuePanel';
import { WorkflowPanel } from './components/workflow/WorkflowPanel';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useStore } from './store';
import { MSG } from '@shared/message-types';
import type {
  FullScrapeResult,
  DesignCritique,
  GeneratedPersona,
  ReconstructedComponent,
} from '@shared/types';
import type { WorkflowSession, WorkflowPhaseId, PhaseStatus } from '@shared/workflow-types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SidebarTabId>('chat');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const isRunning = useStore((s) => s.isRunning);
  const setWorkflowSession = useStore((s) => s.setWorkflowSession);
  const updatePhaseStatus = useStore((s) => s.updatePhaseStatus);
  const updateStepProgress = useStore((s) => s.updateStepProgress);
  const workflowSession = useStore((s) => s.workflowSession);

  // Data from background messages
  const [comparisonResults, setComparisonResults] = useState<FullScrapeResult[]>([]);
  const [critique, setCritique] = useState<DesignCritique | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [personas, setPersonas] = useState<GeneratedPersona[]>([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [reconstructed, setReconstructed] = useState<ReconstructedComponent[]>([]);
  const [reconstructedLoading, setReconstructedLoading] = useState(false);

  // Badges
  const badges: Partial<Record<SidebarTabId, number | string>> = {};
  if (comparisonResults.length > 0) badges.compare = comparisonResults.length;
  if (critique) badges.critique = critique.overallScore;
  if (personas.length > 0) badges.personas = personas.length;
  if (reconstructed.length > 0) badges.components = reconstructed.length;
  if (workflowSession) {
    const phaseName = workflowSession.phases[workflowSession.currentPhase]?.name;
    if (phaseName) badges.workflow = phaseName;
  }

  // Check for onboarding
  useEffect(() => {
    chrome.storage?.local?.get(['claudeApiKey', 'onboardingComplete'], (result) => {
      if (!result.claudeApiKey && !result.onboardingComplete) {
        setShowOnboarding(true);
      }
    });
  }, []);

  // Listen for background messages
  useEffect(() => {
    const listener = (
      message: { type: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ) => {
      switch (message.type) {
        case MSG.MULTI_SITE_COMPLETE: {
          const data = message.payload as { results: FullScrapeResult[] } | undefined;
          if (data?.results) {
            setComparisonResults(data.results);
          }
          break;
        }
        case MSG.CRITIQUE_RESULT: {
          const data = message.payload as DesignCritique | undefined;
          setCritiqueLoading(false);
          if (data) setCritique(data);
          break;
        }
        case MSG.CRITIQUE_DESIGN: {
          setCritiqueLoading(true);
          break;
        }
        case MSG.PERSONAS_RESULT: {
          const data = message.payload as GeneratedPersona[] | undefined;
          setPersonasLoading(false);
          if (data) setPersonas(data);
          break;
        }
        case MSG.GENERATE_PERSONAS: {
          setPersonasLoading(true);
          break;
        }
        case MSG.RECONSTRUCT_COMPLETE: {
          const data = message.payload as ReconstructedComponent[] | undefined;
          setReconstructedLoading(false);
          if (data) setReconstructed(data);
          break;
        }
        case MSG.RECONSTRUCT_COMPONENTS: {
          setReconstructedLoading(true);
          break;
        }
        case MSG.WORKFLOW_STATE_SYNC: {
          const session = message.payload as WorkflowSession | undefined;
          if (session) {
            setWorkflowSession(session);
          }
          break;
        }
        case MSG.WORKFLOW_PHASE_STEP_PROGRESS: {
          const data = message.payload as { stepId: string; progress: number } | undefined;
          if (data) {
            updateStepProgress(data.stepId, data.progress);
          }
          break;
        }
        case MSG.WORKFLOW_PHASE_REVIEWING: {
          const data = message.payload as { phaseId: WorkflowPhaseId } | undefined;
          if (data) {
            updatePhaseStatus(data.phaseId, 'reviewing' as PhaseStatus);
          }
          break;
        }
        case MSG.WORKFLOW_PHASE_COMPLETE: {
          const data = message.payload as { phaseId: WorkflowPhaseId } | undefined;
          if (data) {
            updatePhaseStatus(data.phaseId, 'completed' as PhaseStatus);
          }
          break;
        }
        case MSG.WORKFLOW_COMPLETE: {
          const session = message.payload as WorkflowSession | undefined;
          if (session) {
            setWorkflowSession(session);
          }
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [setWorkflowSession, updatePhaseStatus, updateStepProgress]);

  const handleOnboardingComplete = useCallback(() => {
    chrome.storage?.local?.set({ onboardingComplete: true });
    setShowOnboarding(false);
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    chrome.storage?.local?.set({ onboardingComplete: true });
    setShowOnboarding(false);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  if (showOnboarding) {
    return (
      <div className="flex flex-col h-screen bg-dark-0">
        <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-0">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={badges}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Compact header */}
        <header className="flex items-center justify-between border-b border-dark-3/30 bg-dark-1/50 px-4 py-1.5 flex-shrink-0">
          <span className="text-[11px] font-medium text-gray-400 capitalize">
            {activeTab === 'queue' ? 'Batch Queue' : activeTab === 'workflow' ? 'Workflow' : activeTab}
          </span>
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[10px] text-brand-400 font-medium">Scraping</span>
            </div>
          )}
        </header>

        {/* Content area */}
        <main className="flex flex-1 flex-col min-h-0">
          {activeTab === 'chat' && <ChatContainer />}

          {activeTab === 'scrape' && (
            <div className="flex flex-1 flex-col min-h-0">
              <ScrapeProgress />
              {isRunning && <PreviewPanel />}
            </div>
          )}

          {activeTab === 'workflow' && <WorkflowPanel />}
          {activeTab === 'results' && <ResultsOverview />}
          {activeTab === 'compare' && <ComparisonView results={comparisonResults} />}
          {activeTab === 'critique' && <CritiquePanel critique={critique} loading={critiqueLoading} />}
          {activeTab === 'personas' && <PersonaList personas={personas} loading={personasLoading} />}
          {activeTab === 'components' && <ReconstructedGallery components={reconstructed} loading={reconstructedLoading} />}
          {activeTab === 'queue' && <BatchQueuePanel onViewResults={(url) => { setActiveTab('results'); }} />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
};
