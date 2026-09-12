// frontend/src/components/AIProjectSummary.tsx
//
// "Generate AI Summary" button + animated summary card.
// Drop this anywhere you have a projectId available.

import { useProjectSummary } from '../hooks/useAI';

interface AIProjectSummaryProps {
  projectId: string;
  projectName: string;
}

export function AIProjectSummary({ projectId, projectName }: AIProjectSummaryProps) {
  const { summary, isLoading, error, generate, reset } = useProjectSummary();

  return (
    <div className="ai-summary">
      {!summary && !isLoading && !error && (
        <button
          type="button"
          className="ai-summary__trigger"
          onClick={() => generate(projectId)}
          title={`Generate AI status report for ${projectName}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
          <span>AI Status Report</span>
        </button>
      )}

      {isLoading && (
        <div className="ai-summary__loading">
          <div className="ai-summary__orb" />
          <span>Analysing project data…</span>
        </div>
      )}

      {error && (
        <div className="ai-summary__error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="ai-summary__retry" onClick={() => generate(projectId)}>
            Retry
          </button>
        </div>
      )}

      {summary && (
        <div className="ai-summary__card">
          <div className="ai-summary__card-header">
            <span className="ai-summary__badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <span>AI Summary</span>
            </span>
            <button
              type="button"
              className="ai-summary__close"
              onClick={reset}
              title="Dismiss"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="ai-summary__text">{summary}</p>
          <button
            type="button"
            className="ai-summary__regen"
            onClick={() => generate(projectId)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>
      )}
    </div>
  );
}
