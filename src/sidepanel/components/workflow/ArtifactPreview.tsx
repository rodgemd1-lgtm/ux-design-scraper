import React from 'react';
import type { GeneratedPersona } from '@shared/types';
import type { DesignDirection, DevelopArtifacts } from '@shared/workflow-types';

interface ArtifactPreviewProps {
  artifactKey: string;
  data: unknown;
}

const PersonasPreview: React.FC<{ personas: GeneratedPersona[] }> = ({ personas }) => (
  <div className="space-y-2">
    {personas.map((p, i) => (
      <div key={i} className="flex items-center gap-2 rounded-md bg-dark-3/20 px-2.5 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-bold text-brand-400 flex-shrink-0">
          {p.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-300 truncate">{p.name}</p>
          {p.occupation && (
            <p className="text-[9px] text-gray-500 truncate">{p.occupation}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);

const DesignBriefPreview: React.FC<{ brief: Record<string, unknown> }> = ({ brief }) => {
  const fields = ['projectName', 'goal', 'designDirection', 'timeline'] as const;
  return (
    <div className="space-y-1.5">
      {fields.map((field) => {
        const value = brief[field];
        if (!value) return null;
        return (
          <div key={field} className="flex items-start gap-2">
            <span className="text-[9px] text-gray-600 uppercase font-semibold w-16 flex-shrink-0">
              {field.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-[10px] text-gray-300 line-clamp-2">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </span>
          </div>
        );
      })}
      {Array.isArray(brief.constraints) && (
        <div className="flex items-start gap-2">
          <span className="text-[9px] text-gray-600 uppercase font-semibold w-16 flex-shrink-0">Constraints</span>
          <span className="text-[10px] text-gray-400">{(brief.constraints as string[]).length} defined</span>
        </div>
      )}
    </div>
  );
};

const DesignDirectionsPreview: React.FC<{ directions: DesignDirection[] }> = ({ directions }) => (
  <div className="space-y-2">
    {directions.map((d, i) => (
      <div key={i} className="rounded-md bg-dark-3/20 px-2.5 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-gray-300">{d.name}</span>
          {d.score !== undefined && (
            <span className={`text-[9px] font-bold tabular-nums ${
              d.score >= 80 ? 'text-emerald-400' : d.score >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {d.score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {[d.colorDirection.primary, d.colorDirection.secondary, d.colorDirection.accent].map((color, ci) => (
            <div
              key={ci}
              className="h-4 w-4 rounded-sm border border-dark-3/50"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <span className="text-[9px] text-gray-600 ml-1">
            {d.typographyDirection.headingFont}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const DesignSystemPreview: React.FC<{ system: DevelopArtifacts['designSystem'] }> = ({ system }) => {
  if (!system) return null;
  return (
    <div className="space-y-3">
      {/* Color Palette */}
      {system.colorPalette.length > 0 && (
        <div>
          <span className="text-[9px] text-gray-600 uppercase font-semibold">Colors</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {system.colorPalette.slice(0, 12).map((c, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-sm border border-dark-3/50 cursor-default"
                style={{ backgroundColor: c.value }}
                title={`${c.name}: ${c.value}`}
              />
            ))}
            {system.colorPalette.length > 12 && (
              <span className="text-[9px] text-gray-600 self-center ml-1">
                +{system.colorPalette.length - 12}
              </span>
            )}
          </div>
        </div>
      )}
      {/* Typography Scale */}
      {system.typographyScale.length > 0 && (
        <div>
          <span className="text-[9px] text-gray-600 uppercase font-semibold">Type Scale</span>
          <div className="mt-1 space-y-0.5">
            {system.typographyScale.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 w-10 flex-shrink-0 font-mono">{t.size}</span>
                <span className="text-[10px] text-gray-400">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ComponentsPreview: React.FC<{ components: Array<{ name?: string; componentName?: string }> }> = ({ components }) => (
  <div className="flex flex-wrap gap-1.5">
    {components.slice(0, 10).map((c, i) => (
      <span
        key={i}
        className="rounded-md bg-dark-3/30 px-2 py-1 text-[10px] text-gray-400 font-mono"
      >
        {c.componentName ?? c.name ?? `Component ${i + 1}`}
      </span>
    ))}
    {components.length > 10 && (
      <span className="text-[9px] text-gray-600 self-center">
        +{components.length - 10} more
      </span>
    )}
  </div>
);

const ClaudeMdPreview: React.FC<{ content: string }> = ({ content }) => {
  const truncated = content.length > 500 ? content.slice(0, 500) + '...' : content;
  return (
    <pre className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap break-words font-mono bg-dark-3/20 rounded-md p-2 max-h-40 overflow-y-auto scrollbar-thin">
      {truncated}
    </pre>
  );
};

const JsonPreview: React.FC<{ data: unknown }> = ({ data }) => {
  let formatted: string;
  try {
    formatted = JSON.stringify(data, null, 2);
    if (formatted.length > 600) {
      formatted = formatted.slice(0, 600) + '\n...';
    }
  } catch {
    formatted = String(data);
  }

  return (
    <pre className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap break-words font-mono bg-dark-3/20 rounded-md p-2 max-h-40 overflow-y-auto scrollbar-thin">
      {formatted}
    </pre>
  );
};

export const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifactKey, data }) => {
  if (data === null || data === undefined) {
    return <span className="text-[10px] text-gray-600 italic">No data</span>;
  }

  switch (artifactKey) {
    case 'personas':
      return <PersonasPreview personas={data as GeneratedPersona[]} />;

    case 'designBrief':
      return <DesignBriefPreview brief={data as Record<string, unknown>} />;

    case 'designDirections':
      return <DesignDirectionsPreview directions={data as DesignDirection[]} />;

    case 'designSystem':
      return <DesignSystemPreview system={data as DevelopArtifacts['designSystem']} />;

    case 'reconstructedComponents':
      return <ComponentsPreview components={data as Array<{ name?: string; componentName?: string }>} />;

    case 'claudeMd':
      return <ClaudeMdPreview content={data as string} />;

    default:
      return <JsonPreview data={data} />;
  }
};
