// frontend/src/components/ActivityFeed.tsx
//
// Renders the live activity feed with missed-event catchup:
//   1. Subscribe to live events FIRST (buffer them, don't render yet).
//   2. Fetch the last N events from the DB.
//   3. Merge: seed with fetched, then append buffered extras (de-duped).
//   4. From then on, new live events prepend directly.
//
// `projectId` is optional: pass it for a PM's per-project feed (this
// component calls joinProject/leaveProject). Omit it for the Admin global
// feed or a Developer's own-tasks feed — the server already put them in
// the right room on socket connect.

import { useEffect, useRef, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { useSocket } from '../context/SocketContext'
import { formatDistanceToNow } from 'date-fns';
import type { ActivityEvent } from '../types/domain';

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

interface ActivityResponse {
  activityLogs: ActivityEvent[];
  nextCursor: string | null;
}

export function ActivityFeed({ projectId, limit = 20 }: ActivityFeedProps) {
  const { joinProject, leaveProject, subscribeToActivity } = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buffers live events that arrive before the REST catchup fetch resolves.
  const bufferRef = useRef<ActivityEvent[]>([]);
  const hasSeededRef = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setEvents([]);
    bufferRef.current = [];
    hasSeededRef.current = false;

    if (projectId) {
      joinProject(projectId).catch(() => {
        // Room join error — REST fetch will set error state; non-fatal here.
      });
    }

    // Step 1: subscribe first to buffer events during the REST fetch.
    const unsubscribe = subscribeToActivity((event) => {
      if (!hasSeededRef.current) {
        bufferRef.current.push(event);
        return;
      }
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev;
        return [event, ...prev];
      });
    });

    // Step 2 + 3: fetch then merge with buffered events.
    async function loadInitialEvents() {
      try {
        const params: Record<string, string | number> = { limit };
        if (projectId) params.projectId = projectId;

        const res = await apiClient.get<ActivityResponse>('/api/activity', { params });
        const fetched = res.data.activityLogs;

        const buffered = bufferRef.current;
        const fetchedIds = new Set(fetched.map((e) => e.id));
        const newFromBuffer = buffered.filter((e) => !fetchedIds.has(e.id));

        // Buffered events are the newest (arrived after the fetch was issued).
        setEvents([...newFromBuffer, ...fetched]);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        hasSeededRef.current = true;
        bufferRef.current = [];
        setIsLoading(false);
      }
    }

    loadInitialEvents();

    return () => {
      unsubscribe();
      if (projectId) {
        leaveProject(projectId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, limit]);

  if (isLoading) {
    return <div className="activity-feed activity-feed--loading">Loading activity…</div>;
  }

  if (error) {
    return <div className="activity-feed activity-feed--error">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="activity-feed activity-feed--empty">No activity yet.</div>;
  }

  return (
    <ul className="activity-feed">
      {events.map((event) => (
        <li key={event.id} className="activity-feed__item">
          <span className="activity-feed__message">{event.message}</span>
          <span className="activity-feed__time">
            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
          </span>
        </li>
      ))}
    </ul>
  );
}