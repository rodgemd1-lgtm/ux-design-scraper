import React, { useState, useMemo } from 'react';

export interface ComparisonColumn {
  id: string;
  label: string;
  color?: string;
}

export interface ComparisonRow {
  metric: string;
  category?: string;
  values: Record<string, string | number>;
  higherIsBetter?: boolean;
  format?: 'number' | 'percent' | 'text' | 'score' | 'duration';
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  title?: string;
  sortable?: boolean;
}

function formatValue(value: string | number, format?: ComparisonRow['format']): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'percent':
      return `${value}%`;
    case 'score':
      return `${value}/100`;
    case 'duration':
      return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

function getCellRank(
  value: string | number,
  allValues: (string | number)[],
  higherIsBetter: boolean
): 'best' | 'worst' | 'neutral' {
  const numValues = allValues.filter((v) => typeof v === 'number') as number[];
  if (numValues.length < 2 || typeof value !== 'number') return 'neutral';

  const sorted = [...numValues].sort((a, b) => (higherIsBetter ? b - a : a - b));
  if (value === sorted[0]) return 'best';
  if (value === sorted[sorted.length - 1]) return 'worst';
  return 'neutral';
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  columns,
  rows,
  title,
  sortable = true,
}) => {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a.values[sortCol];
      const bVal = b.values[sortCol];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [rows, sortCol, sortAsc]);

  const handleSort = (colId: string) => {
    if (!sortable) return;
    if (sortCol === colId) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colId);
      setSortAsc(true);
    }
  };

  return (
    <div className="w-full animate-in">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          {title}
        </h4>
      )}
      <div className="overflow-x-auto scrollbar-thin rounded-xl border border-dark-3/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-dark-2/80">
              <th className="sticky left-0 z-10 bg-dark-2/95 backdrop-blur-sm px-3 py-2.5 text-left font-semibold text-gray-400 border-b border-dark-3/30 min-w-[100px]">
                Metric
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id)}
                  className={`px-3 py-2.5 text-center font-semibold border-b border-dark-3/30 min-w-[80px] ${
                    sortable ? 'cursor-pointer hover:text-brand-400 transition-colors' : ''
                  }`}
                  style={{ color: col.color || undefined }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="truncate max-w-[80px]">{col.label}</span>
                    {sortable && sortCol === col.id && (
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={sortAsc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => {
              const allVals = columns.map((c) => row.values[c.id]);
              return (
                <tr
                  key={ri}
                  className="border-b border-dark-3/20 last:border-0 hover:bg-dark-2/40 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-dark-1/95 backdrop-blur-sm px-3 py-2 text-gray-300 font-medium">
                    <div className="flex flex-col">
                      <span>{row.metric}</span>
                      {row.category && (
                        <span className="text-[9px] text-gray-600 mt-0.5">{row.category}</span>
                      )}
                    </div>
                  </td>
                  {columns.map((col) => {
                    const value = row.values[col.id];
                    const rank = getCellRank(value, allVals, row.higherIsBetter !== false);
                    return (
                      <td key={col.id} className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
                            rank === 'best'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : rank === 'worst'
                              ? 'bg-red-500/10 text-red-400'
                              : 'text-gray-300'
                          }`}
                        >
                          {rank === 'best' && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.996.178-1.768.563-2.293 1.174a4.5 4.5 0 0 0-1.207 3.465c.186 1.416 1.004 2.706 2.379 3.735m13.621-8.374c.996.178 1.768.563 2.293 1.174a4.5 4.5 0 0 1 1.207 3.465c-.186 1.416-1.004 2.706-2.379 3.735" />
                            </svg>
                          )}
                          {formatValue(value, row.format)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
