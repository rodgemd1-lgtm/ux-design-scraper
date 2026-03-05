import React, { useState, useCallback } from 'react';

export type SidebarTabId =
  | 'chat'
  | 'workflow'
  | 'scrape'
  | 'compare'
  | 'results'
  | 'critique'
  | 'personas'
  | 'components'
  | 'queue'
  | 'settings';

interface SidebarNavItem {
  id: SidebarTabId;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  section?: 'main' | 'analysis' | 'tools';
}

interface SidebarProps {
  activeTab: SidebarTabId;
  onTabChange: (tab: SidebarTabId) => void;
  badges?: Partial<Record<SidebarTabId, number | string>>;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const navItems: SidebarNavItem[] = [
  // Main
  {
    id: 'chat',
    label: 'Chat',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    id: 'workflow',
    label: 'Workflow',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    id: 'scrape',
    label: 'Scrape',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    id: 'results',
    label: 'Results',
    section: 'main',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  // Analysis
  {
    id: 'compare',
    label: 'Compare',
    section: 'analysis',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    id: 'critique',
    label: 'Critique',
    section: 'analysis',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
  },
  {
    id: 'personas',
    label: 'Personas',
    section: 'analysis',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  // Tools
  {
    id: 'components',
    label: 'Components',
    section: 'tools',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
      </svg>
    ),
  },
  {
    id: 'queue',
    label: 'Queue',
    section: 'tools',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    section: 'tools',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

const sectionLabels: Record<string, string> = {
  main: '',
  analysis: 'Analysis',
  tools: 'Tools',
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  badges = {},
  darkMode = true,
  onToggleDarkMode,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sections = ['main', 'analysis', 'tools'] as const;

  return (
    <nav
      className="flex flex-col h-full border-r border-dark-3/30 bg-dark-1/50 backdrop-blur-sm transition-all duration-300 ease-in-out"
      style={{ width: isHovered ? 180 : 48 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo area */}
      <div className="flex items-center h-10 px-3 border-b border-dark-3/20 flex-shrink-0 overflow-hidden">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 flex-shrink-0">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </div>
        <span
          className={`ml-2 text-[11px] font-semibold text-gray-300 whitespace-nowrap transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          UX Scraper
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section);
          const label = sectionLabels[section];
          return (
            <div key={section} className={section !== 'main' ? 'mt-2' : ''}>
              {label && isHovered && (
                <div className="px-3 py-1">
                  <span className="text-[8px] uppercase tracking-widest font-semibold text-gray-600">
                    {label}
                  </span>
                </div>
              )}
              {!label && section !== 'main' && !isHovered && (
                <div className="mx-3 my-1 h-px bg-dark-3/30" />
              )}
              {items.map((item) => {
                const isActive = activeTab === item.id;
                const badge = badges[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                      relative w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-200
                      ${
                        isActive
                          ? 'text-brand-400 bg-brand-500/8'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2/50'
                      }
                    `}
                    title={!isHovered ? item.label : undefined}
                    aria-selected={isActive}
                    role="tab"
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-brand-500" />
                    )}

                    <div className="flex-shrink-0 relative">
                      {item.icon}
                      {/* Badge (collapsed) */}
                      {badge !== undefined && !isHovered && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-brand-500 text-[7px] text-white font-bold px-1">
                          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-medium whitespace-nowrap transition-opacity duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0 w-0'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Badge (expanded) */}
                    {badge !== undefined && isHovered && (
                      <span className="ml-auto rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-bold text-brand-400 tabular-nums">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col border-t border-dark-3/20 py-2 flex-shrink-0">
        {/* Dark mode toggle */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-dark-2/50 transition-all duration-200"
            title={!isHovered ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
          >
            {darkMode ? (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
            <span
              className={`text-xs font-medium whitespace-nowrap transition-opacity duration-200 ${
                isHovered ? 'opacity-100' : 'opacity-0 w-0'
              }`}
            >
              {darkMode ? 'Light' : 'Dark'}
            </span>
          </button>
        )}

        {/* Help */}
        <button
          className="flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-dark-2/50 transition-all duration-200"
          title={!isHovered ? 'Help' : undefined}
        >
          <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
          <span
            className={`text-xs font-medium whitespace-nowrap transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            Help
          </span>
        </button>
      </div>
    </nav>
  );
};
