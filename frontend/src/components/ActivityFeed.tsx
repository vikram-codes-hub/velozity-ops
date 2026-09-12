import { useEffect, useRef, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { formatActivityLine } from '../lib/time';
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

  const bufferRef = useRef<ActivityEvent[]>([]);
  const hasSeededRef = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setEvents([]);
    bufferRef.current = [];
    hasSeededRef.current = false;

    if (projectId) {
      joinProject(projectId).catch(() => {});
    }

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

    async function loadInitialEvents() {
      try {
        const params: Record<string, string | number> = { limit };
        if (projectId) params.projectId = projectId;

        const res = await apiClient.get<ActivityResponse>('/api/activity', { params });
        const fetched = res.data.activityLogs;

        const buffered = bufferRef.current;
        const fetchedIds = new Set(fetched.map((e) => e.id));
        const newFromBuffer = buffered.filter((e) => !fetchedIds.has(e.id));

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
    return (
      <div className="activity-feed activity-feed--loading">
        <div className="spinner spinner--sm" />
        <span>Loading live activity…</span>
      </div>
    );
  }

  if (error) {
    return <div className="activity-feed activity-feed--error">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="activity-feed activity-feed--empty">No activity recorded yet.</div>;
  }

  return (
    <ul className="activity-feed">
      {events.map((event) => {
        const displayMessage =
          event.message ||
          formatActivityLine({
            userName: event.userName ?? event.actorName,
            action: event.action,
            taskLabel: event.taskTitle ?? (event.taskId ? `Task #${event.taskId.slice(0, 6)}` : 'Project'),
            fromValue: event.fromValue,
            toValue: event.toValue,
            createdAt: event.createdAt,
          });

        return (
          <li key={event.id} className="activity-feed__item">
            <div className="activity-feed__node">
              <span className="activity-feed__dot" />
            </div>
            <div className="activity-feed__content">
              <p className="activity-feed__message">{displayMessage}</p>
              <span className="activity-feed__time">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}