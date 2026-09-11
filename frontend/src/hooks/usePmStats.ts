// frontend/src/hooks/usePmStats.ts
//
// Backs the PM dashboard (spec §2.4): "their projects summary, tasks by
// priority, upcoming due dates this week." No projectId is passed to
// useProjects/useTasks — the backend already scopes both to the calling
// PM's own projects (per the ownership pattern in the doc: PM queries
// filter on createdById = req.user.id), so this hook doesn't do any
// scoping itself, just aggregation on top of what comes back.

import { useMemo } from "react";
import { useProjects } from "./useProjects";
import { useTasks } from "./useTasks";
import type { Priority, Task } from "./Domain";

const PRIORITY_ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface PmStats {
  totalProjects: number;
  totalTasks: number;
  tasksByPriority: Record<Priority, number>;
  upcomingDueThisWeek: Task[];
  isLoading: boolean;
  error: string | null;
}

export function usePmStats(): PmStats {
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTasks({ filters: {} });

  const tasksByPriority = useMemo(() => {
    const counts: Record<Priority, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const task of tasks) {
      if (counts[task.priority] !== undefined) {
        counts[task.priority] += 1;
      }
    }
    return counts;
  }, [tasks]);

  const upcomingDueThisWeek = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + WEEK_MS;

    return tasks
      .filter((task: Task) => {
        if (task.status === "DONE") return false;
        const dueTime = new Date(task.dueDate).getTime();
        return dueTime >= now && dueTime <= weekFromNow;
      })
      .sort((a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks]);

  return {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    tasksByPriority,
    upcomingDueThisWeek,
    isLoading: projectsLoading || tasksLoading,
    error: projectsError ?? tasksError,
  };
}

export { PRIORITY_ORDER };
