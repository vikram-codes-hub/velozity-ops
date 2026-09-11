// frontend/src/hooks/useTaskFilters.ts
//
// The piece proposed but not yet built in the project context doc (§5):
// centralizes the date-string-to-ISO conversion and URL-param syncing that
// currently lives inline in TaskList.tsx / FilterBar.tsx. Sits directly
// above useTasks() — its output is a plain TaskFilters object, so:
//
//   const { filters, setStatus, setPriority, setDueRange, clearFilters } = useTaskFilters();
//   const { tasks, ... } = useTasks({ projectId, filters });
//
// Query params are the shareable-URL contract from the spec (§2.4):
// ?status=&priority=&dueFrom=&dueTo=. dueFrom/dueTo are stored in the URL
// as plain date-only strings (YYYY-MM-DD, what a native <input type="date">
// produces) and converted to full ISO instants only at the boundary where
// they're handed to the API — the URL itself stays human-readable.
//
// ASSUMPTIONS:
//   - React Router v6, useSearchParams from "react-router-dom"
//   - dueFrom is normalized to start-of-day, dueTo to end-of-day, both in
//     the browser's local timezone (adjust here if the backend expects UTC
//     boundaries instead)

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Priority, TaskFilters, TaskStatus } from "./Domain";

const VALID_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
const VALID_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function dateOnlyToStartOfDayIso(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toISOString();
}

function dateOnlyToEndOfDayIso(dateOnly: string): string {
  return new Date(`${dateOnly}T23:59:59.999`).toISOString();
}

interface UseTaskFiltersResult {
  /** Ready to pass straight into useTasks({ filters }) — dates already ISO. */
  filters: TaskFilters;
  /** Raw date-only strings (YYYY-MM-DD) for binding to <input type="date">. */
  rawDueFrom: string;
  rawDueTo: string;
  setStatus: (status: TaskStatus | null) => void;
  setPriority: (priority: Priority | null) => void;
  setDueRange: (dueFrom: string | null, dueTo: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useTaskFilters(): UseTaskFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get("status");
  const rawPriority = searchParams.get("priority");
  const rawDueFrom = searchParams.get("dueFrom") ?? "";
  const rawDueTo = searchParams.get("dueTo") ?? "";

  const filters = useMemo<TaskFilters>(() => {
    const result: TaskFilters = {};

    if (rawStatus && VALID_STATUSES.includes(rawStatus as TaskStatus)) {
      result.status = rawStatus as TaskStatus;
    }
    if (rawPriority && VALID_PRIORITIES.includes(rawPriority as Priority)) {
      result.priority = rawPriority as Priority;
    }
    if (rawDueFrom) {
      result.dueFrom = dateOnlyToStartOfDayIso(rawDueFrom);
    }
    if (rawDueTo) {
      result.dueTo = dateOnlyToEndOfDayIso(rawDueTo);
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawStatus, rawPriority, rawDueFrom, rawDueTo]);

  const setStatus = useCallback((status: TaskStatus | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status) next.set("status", status);
      else next.delete("status");
      return next;
    });
  }, [setSearchParams]);

  const setPriority = useCallback((priority: Priority | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (priority) next.set("priority", priority);
      else next.delete("priority");
      return next;
    });
  }, [setSearchParams]);

  const setDueRange = useCallback((dueFrom: string | null, dueTo: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (dueFrom) next.set("dueFrom", dueFrom);
      else next.delete("dueFrom");
      if (dueTo) next.set("dueTo", dueTo);
      else next.delete("dueTo");
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("status");
      next.delete("priority");
      next.delete("dueFrom");
      next.delete("dueTo");
      return next;
    });
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(rawStatus || rawPriority || rawDueFrom || rawDueTo);

  return {
    filters,
    rawDueFrom,
    rawDueTo,
    setStatus,
    setPriority,
    setDueRange,
    clearFilters,
    hasActiveFilters,
  };
}