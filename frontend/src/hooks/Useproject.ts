// frontend/src/hooks/useProject.ts
//
// Single-project detail hook. This is the natural place to own the
// project:<projectId> WebSocket room lifecycle described in the project
// context doc (§1): a PM/Admin viewing a project's detail page joins that
// room explicitly, and the server re-verifies ownership on every join
// attempt. Any component rendering a project detail view (PMDashboard,
// a future ProjectDetailPage, etc.) can use this hook and get correct
// join-on-mount / leave-on-unmount behavior for free, without duplicating
// that logic per component.
//
// ASSUMPTIONS:
//   - GET /api/projects/:id -> Project (404 if PM doesn't own it, per the
//     "disallowed role -> 403, wrong-owner -> 404" convention in the doc)
//   - useSocket() exposes joinProject(projectId) / leaveProject(projectId)

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { Project } from "./Domain";

interface UseProjectResult {
  project: Project | null;
  isLoading: boolean;
  /** True once the server has confirmed the project:<id> room join. */
  isJoined: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProject(projectId: string | null | undefined): UseProjectResult {
  const { joinProject, leaveProject } = useSocket();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Project>(`/api/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      // A 404 here means either the project doesn't exist or this user
      // doesn't own it — deliberately indistinguishable per the ownership
      // pattern in the doc, so surface a single generic message.
      setError("Couldn't load this project.");
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    fetchProject();

    joinProject(projectId).then(() => {
      if (!cancelled) setIsJoined(true);
    });

    return () => {
      cancelled = true;
      setIsJoined(false);
      leaveProject(projectId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return { project, isLoading, isJoined, error, refetch: fetchProject };
}