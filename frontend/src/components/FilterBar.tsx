// frontend/src/components/FilterBar.tsx
//
// Filters for any task list (status, priority, due-date range), synced to
// the URL via useSearchParams — per spec, filters must be shareable as a
// URL, not just held in local component state. The URL is the single
// source of truth here: there's no separate `useState` for the filter
// values that could drift out of sync with what's in the address bar.
//
// Usage: drop this above a task list component that reads the same
// `useSearchParams()` (or receives the parsed filters as props) to build
// its `GET /api/tasks?...` query — this component only owns the controls,
// not the fetching.

import { useSearchParams } from 'react-router-dom';
import { ChangeEvent } from 'react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const;

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

export function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const dueFrom = searchParams.get('dueFrom') ?? '';
  const dueTo = searchParams.get('dueTo') ?? '';

  // Sets or removes a single param without disturbing the others already
  // in the URL (e.g. changing status shouldn't wipe out a due-date range
  // someone already set).
  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handleSelectChange(key: string) {
    return (e: ChangeEvent<HTMLSelectElement>) => updateParam(key, e.target.value);
  }

  function handleDateChange(key: string) {
    return (e: ChangeEvent<HTMLInputElement>) => updateParam(key, e.target.value);
  }

  function clearAll() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ['status', 'priority', 'dueFrom', 'dueTo'].forEach((key) => next.delete(key));
      return next;
    });
  }

  const hasActiveFilters = Boolean(status || priority || dueFrom || dueTo);

  return (
    <div className="filter-bar">
      <div className="filter-bar__field">
        <label htmlFor="filter-status">Status</label>
        <select id="filter-status" value={status} onChange={handleSelectChange('status')}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field">
        <label htmlFor="filter-priority">Priority</label>
        <select id="filter-priority" value={priority} onChange={handleSelectChange('priority')}>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__field">
        <label htmlFor="filter-due-from">Due from</label>
        <input
          id="filter-due-from"
          type="date"
          value={dueFrom}
          onChange={handleDateChange('dueFrom')}
          max={dueTo || undefined}
        />
      </div>

      <div className="filter-bar__field">
        <label htmlFor="filter-due-to">Due to</label>
        <input
          id="filter-due-to"
          type="date"
          value={dueTo}
          onChange={handleDateChange('dueTo')}
          min={dueFrom || undefined}
        />
      </div>

      {hasActiveFilters && (
        <button type="button" className="filter-bar__clear" onClick={clearAll}>
          Clear filters
        </button>
      )}
    </div>
  );
}