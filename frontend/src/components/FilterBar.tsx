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
      <div className="filter-bar__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>Filter Tasks</span>
      </div>

      <div className="filter-bar__fields">
        <div className="filter-bar__field">
          <label htmlFor="filter-status">Status</label>
          <div className="select-wrapper">
            <select id="filter-status" value={status} onChange={handleSelectChange('status')}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="filter-bar__field">
          <label htmlFor="filter-priority">Priority</label>
          <div className="select-wrapper">
            <select id="filter-priority" value={priority} onChange={handleSelectChange('priority')}>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="filter-bar__field">
          <label htmlFor="filter-due-from">Due from</label>
          <input
            id="filter-due-from"
            type="date"
            className="input input--date"
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
            className="input input--date"
            value={dueTo}
            onChange={handleDateChange('dueTo')}
            min={dueFrom || undefined}
          />
        </div>

        {hasActiveFilters && (
          <button type="button" className="filter-bar__clear" onClick={clearAll}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}