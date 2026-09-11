// frontend/src/hooks/useProjects.ts
//
// Role-scoped project list for the Admin/PM dashboards. The backend applies
// ownership filtering (Admin sees all, PM sees only createdById = self), so
// this hook doesn't need to know the caller's role — it just calls the list
// endpoint and trusts the response.
//
// ASSUMPTIONS:
//   - GET  /api/projects   -> Project[]
//   - POST /api/projects   -> Project   (body: { name, clientId })

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import type { Project } from "./Domain";

interface CreateProjectInput {
  name: string;
  clientId: string;
}

interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Project[]>("/api/projects");
      setProjects(data);
    } catch (err) {
      setError("Couldn't load projects.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    const { data } = await apiClient.post<Project>("/api/projects", input);
    // Prepend rather than refetch — avoids a redundant round trip and keeps
    // the newest project visible at the top immediately.
    setProjects((prev) => [data, ...prev]);
    return data;
  }, []);

  return { projects, isLoading, error, refetch: fetchProjects, createProject };
}