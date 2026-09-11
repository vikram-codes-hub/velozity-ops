// frontend/src/hooks/useAdminStats.ts
//
// Computes / fetches aggregated statistics for the Admin dashboard:
//   - totalProjects
//   - totalTasks
//   - overdueCount
//   - activeUsersOnline (from SocketContext presence:update)
//   - tasksByStatus breakdown object

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { TaskStatus } from "./Domain";

export interface AdminStats {
  totalProjects: number;
  totalTasks: number;
  overdueCount: number;
  activeUsersOnline: number;
  tasksByStatus: Record<TaskStatus, number>;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_TASKS_BY_STATUS: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
  OVERDUE: 0,
};

export function useAdminStats(): AdminStats {
  const { onlineCount } = useSocket();
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, number>>(
    INITIAL_TASKS_BY_STATUS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch projects count & tasks overview in parallel
        const [projectsRes, tasksRes] = await Promise.all([
          apiClient.get<any[]>("/api/projects").catch(() => ({ data: [] })),
          apiClient.get<{ data?: any[]; tasks?: any[] }>("/api/tasks?limit=100").catch(() => ({ data: { data: [] } })),
        ]);

        if (cancelled) return;

        const projects = projectsRes.data ?? [];
        setTotalProjects(projects.length);

        const rawTasks = Array.isArray(tasksRes.data)
          ? tasksRes.data
          : tasksRes.data?.data ?? tasksRes.data?.tasks ?? [];

        const counts: Record<TaskStatus, number> = { ...INITIAL_TASKS_BY_STATUS };
        let overdue = 0;

        for (const task of rawTasks) {
          if (task.status && counts[task.status as TaskStatus] !== undefined) {
            counts[task.status as TaskStatus]++;
          }
          if (task.status === "OVERDUE") {
            overdue++;
          }
        }

        setTasksByStatus(counts);
        setTotalTasks(rawTasks.length);
        setOverdueCount(overdue);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load admin stats.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    totalProjects,
    totalTasks,
    overdueCount,
    activeUsersOnline: onlineCount ?? 0,
    tasksByStatus,
    isLoading,
    error,
  };
}
