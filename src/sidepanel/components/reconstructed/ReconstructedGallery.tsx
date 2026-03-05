import React, { useState, useMemo, useCallback } from 'react';
import type { ReconstructedComponent } from '@shared/types';

type CodeTab = 'tsx' | 'props' | 'story';

interface ReconstructedGalleryProps {
  components: ReconstructedComponent[];
  loading?: boolean;
}

function generateCodeSandboxUrl(component: ReconstructedComponent): string {
  const files: Record<string, { content: string }> = {
    'src/App.tsx': {
      content: `import React from 'react';\nimport { ${component.name} } from './${component.name}';\n\nexport default function App() {\n  return (\n    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>\n      <h2>${component.name}</h2>\n      ${component.usageExample || `<${component.name} />`}\n    </div>\n  );\n}`,
    },
    [`src/${component.name}.tsx`]: {
      content: component.tsx,
    },
    'package.json': {
      content: JSON.stringify({
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: { typescript: '^5.0.0', '@types/react': '^18.0.0' },
      }),
    },
  };

  const params = new URLSearchParams({
    parameters: btoa(JSON.stringify({ files })),
  });

  return `https://codesandbox.io/api/v1/sandboxes/define?${params.toString()}`;
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ===== Component Card =====
const ComponentCard: React.FC<{
  component: ReconstructedComponent;
  index: number;
}> = ({ component, index }) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('tsx');
  const [copied, setCopied] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const codeContent = useMemo(() => {
    switch (activeTab) {
      case 'tsx':
        return component.tsx;
      case 'props':
        return component.propsInterface;
      case 'story':
        return component.storybookStory;
    }
  }, [activeTab, component]);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [codeContent]);

  // Sandboxed preview HTML
  const previewHtml = useMemo(() => {
    // Create a simple HTML wrapper that renders the component's usage example
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #1a1b1e; color: #e9ecef; font-size: 14px; }
    * { box-sizing: border-box; }
    .preview-container { display: flex; align-items: center; justify-content: center; min-height: 80px; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
</head>
<body>
  <div class="preview-container">
    <div style="text-align:center;color:#748ffc;font-size:12px;">
      <div style="margin-bottom:4px;font-weight:600;">${component.name}</div>
      <div style="color:#495057;font-size:10px;">${component.originalType}</div>
    </div>
  </div>
</body>
</html>`;
  }, [component]);

  const csboxUrl = generateCodeSandboxUrl(component);

  const tabs: { id: CodeTab; label: string }[] = [
    { id: 'tsx', label: 'TSX' },
    { id: 'props', label: 'Props' },
    { id: 'story', label: 'Story' },
  ];

  return (
    <div
      className="rounded-xl border border-dark-3/30 bg-dark-1/80 backdrop-blur-sm overflow-hidden animate-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-dark-2/30 border-b border-dark-3/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
          <h4 className="text-xs font-semibold text-gray-200 truncate">{component.name}</h4>
          <span className="rounded-full bg-dark-3/40 px-2 py-0.5 text-[9px] text-gray-500 flex-shrink-0">
            {component.originalType}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {component.responsive && (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] text-emerald-400 font-medium" title="Responsive">
              RWD
            </span>
          )}
          {component.ariaAttributes.length > 0 && (
            <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[8px] text-blue-400 font-medium" title="Accessible">
              A11Y
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="relative h-24 bg-dark-0 border-b border-dark-3/20">
        {!previewError ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title={`Preview: ${component.name}`}
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            Preview unavailable
          </div>
        )}
      </div>

      {/* State variants */}
      {component.stateVariants.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-dark-3/20">
          {component.stateVariants.map((variant, vi) => (
            <span
              key={vi}
              className="rounded-md bg-dark-3/30 border border-dark-3/30 px-1.5 py-0.5 text-[8px] text-gray-500 font-mono"
            >
              {variant}
            </span>
          ))}
        </div>
      )}

      {/* Code tabs */}
      <div className="flex items-center justify-between border-b border-dark-3/20 px-1">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-brand-400 border-b border-brand-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-dark-2 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          )}
          <span className="text-[9px] text-gray-500">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code block */}
      <div className="max-h-48 overflow-y-auto scrollbar-thin bg-dark-0/80">
        <pre className="p-3 text-[10px] leading-relaxed font-mono text-gray-400 whitespace-pre-wrap break-words">
          {codeContent.slice(0, 3000)}
          {codeContent.length > 3000 && (
            <span className="text-gray-600">{'\n// ... truncated ...'}</span>
          )}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-2/20 border-t border-dark-3/20">
        <div className="flex flex-wrap gap-1">
          {component.tailwindClasses.slice(0, 5).map((cls, ci) => (
            <span
              key={ci}
              className="rounded bg-brand-500/8 px-1 py-0.5 text-[8px] text-brand-400/70 font-mono"
            >
              {cls}
            </span>
          ))}
          {component.tailwindClasses.length > 5 && (
            <span className="text-[8px] text-gray-600">+{component.tailwindClasses.length - 5} more</span>
          )}
        </div>
        <a
          href={csboxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-dark-3/30 hover:bg-dark-3/50 transition-colors text-[9px] text-gray-400 hover:text-gray-200"
          title="Open in CodeSandbox"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 6l10.455-6L22.91 6 23 17.95 12.455 24 2 18V6zm2.088 2.481v4.757l3.345 1.86v3.516l3.972 2.296v-8.272L4.088 8.481zm16.739 0l-7.317 4.157v8.272l3.972-2.296v-3.516l3.345-1.86V8.481zM5.134 6.988l7.321 4.148 7.321-4.148-3.532-2.027-3.789 2.137-3.789-2.137-3.532 2.027z"/>
          </svg>
          CodeSandbox
        </a>
      </div>
    </div>
  );
};

// ===== Gallery =====
export const ReconstructedGallery: React.FC<ReconstructedGalleryProps> = ({
  components,
  loading = false,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const componentTypes = useMemo(() => {
    const types = [...new Set(components.map((c) => c.originalType))].sort();
    return ['all', ...types];
  }, [components]);

  const filtered = useMemo(() => {
    if (filter === 'all') return components;
    return components.filter((c) => c.originalType === filter);
  }, [components, filter]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-dark-3/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-sm font-semibold text-gray-300">Reconstructing Components</h3>
        <p className="mt-1.5 text-xs text-gray-500">
          AI is rebuilding components as React + TypeScript + Tailwind...
        </p>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Reconstructed Components</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Run component reconstruction to get AI-generated React components based on scraped designs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-dark-0/95 backdrop-blur-sm border-b border-dark-3/30 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400">
            {filtered.length} Component{filtered.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {componentTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filter === type
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Component cards */}
      <div className="px-4 py-4 space-y-4">
        {filtered.map((component, i) => (
          <ComponentCard key={`${component.name}-${i}`} component={component} index={i} />
        ))}
      </div>
    </div>
  );
};
